#include "FfmpegProcess.h"
#include <unistd.h>
#ifdef __APPLE__
  #include <crt_externs.h>
#endif
#include <sys/wait.h>
#include <stdexcept>
#include <signal.h>
#include <sys/types.h>

using namespace std;

#define PIPE_READ 0
#define PIPE_WRITE 1

FfmpegProcess::FfmpegProcess(string exec, uint32_t width, uint32_t height, uint32_t fps,
    string encoder, string outputPath) :
  Thread("ffmpeg"),
  executable(exec)
{
  // Check options using:
  //   ffmpeg -h encoder=h264_videotoolbox
  // Profile and level are both interesting. Experiment witg "-b:v 2000k"

  // ffmpeg -f rawvideo -pix_fmt rgb24 -vf scale=960x720 1920x1080 -framerate 30 -i pipe:0
  // -c:v h264_videotoolbox -profile:v high -pix_fmt yuv420p -y output.mp4

  // Input options
  arguments.push_back("-f");
  arguments.push_back("rawvideo");

  arguments.push_back("-pix_fmt");
  arguments.push_back("bgra");

  arguments.push_back("-video_size");
  arguments.push_back(to_string(width) + "x" + to_string(height));

  arguments.push_back("-framerate");
  arguments.push_back(to_string(fps));

  arguments.push_back("-i");
  arguments.push_back("pipe:0");

  // Output options
  //arguments.push_back("-vf");
  //arguments.push_back("scale=" + to_string(width) + "x" + to_string(height));

  arguments.push_back("-c:v");
  arguments.push_back(encoder);

  arguments.push_back("-profile:v");
  arguments.push_back("high");

  arguments.push_back("-pix_fmt");
  arguments.push_back("yuv420p");

  arguments.push_back("-y");
  arguments.push_back(outputPath);
}

void* FfmpegProcess::run()
{
  if (!startProcess())
  {
    return 0;
  }
  stdoutReader = shared_ptr<PipeReader>(new PipeReader("ffmpeg_stdout",
    processStdout));
  stdoutReader->spawn();
  stderrReader = shared_ptr<PipeReader>(new PipeReader("ffmpeg_stderr",
    processStderr));
  stderrReader->spawn();
  processMutex.lock();
  processStarted = true;
  processMutex.unlock();
  processStartEvent.notify_one();
  while (isProcessRunning())
  {
    if (!stdoutReader->isRunning() ||
      !stderrReader->isRunning())
    {
      printf("ERROR: A process thread has exited unexpectedly\n");
      break;
    }
    if (checkForExit())
    {
      terminateProcess();
      break;
    }
    usleep(100000);
  }
  stdoutReader->terminate();
  stderrReader->terminate();

  // TODO: Iteratively print the output in the loop above
  printf("## Ffmpeg process has exited\n");
  printf("## Stdout: %s\n", stdoutReader->getData().c_str());
  printf("## Stderr: %s\n", stderrReader->getData().c_str());
  cleanUpProcess();
  return 0;
}

bool FfmpegProcess::startProcess()
{
  vector<string> environment;
  char** env;
#ifdef __APPLE__
  env = *_NSGetEnviron();
#else
  env = environ;
#endif
  for (int i = 0; *(env + i) != 0; i++)
  {
    environment.push_back(*(env + i));
  }
  int stdinPipe[2], stdoutPipe[2], stderrPipe[2];
  if ((pipe(stdinPipe) < 0) || (pipe(stdoutPipe) < 0) || (pipe(stderrPipe) < 0))
  {
    printf("ERROR: Failed to allocate pipes\n");
    return false;
  }
  processPid = fork();
  if (processPid == 0)
  {
    fflush(stdout);
    if (dup2(stdinPipe[PIPE_READ], STDIN_FILENO) == -1)
    {
      fflush(stdout);
      exit(errno);
    }
    if (dup2(stdoutPipe[PIPE_WRITE], STDOUT_FILENO) == -1)
    {
      fflush(stdout);
      exit(errno);
    }
    if (dup2(stderrPipe[PIPE_WRITE], STDERR_FILENO) == -1)
    {
      fflush(stdout);
      exit(errno);
    }
    fflush(stdout);
    close(stdinPipe[PIPE_READ]);
    close(stdinPipe[PIPE_WRITE]); 
    close(stdoutPipe[PIPE_READ]);
    close(stdoutPipe[PIPE_WRITE]); 
    close(stderrPipe[PIPE_READ]);
    close(stderrPipe[PIPE_WRITE]);
    vector<char*> args, env;
    args.push_back(&executable[0]);
    fflush(stdout);
    for (vector<string>::iterator it = arguments.begin(); it != arguments.end();
      ++it)
    {
      args.push_back(&(*it)[0]);
      fflush(stdout);
    }
    args.push_back(NULL);
    for (vector<string>::iterator envIterator = environment.begin();
      envIterator != environment.end(); ++envIterator)
    {
      env.push_back(const_cast<char*>((*envIterator).c_str()));
      fflush(stdout);
     }
    env.push_back(NULL);
    execve(executable.c_str(), args.data(), env.data());
    exit(-1);
  }
  else if (processPid > 0)
  {
    processStdin = stdinPipe[PIPE_WRITE];
    processStdout = stdoutPipe[PIPE_READ];
    processStderr = stderrPipe[PIPE_READ];
    close(stdinPipe[PIPE_READ]); 
    close(stdoutPipe[PIPE_WRITE]); 
    close(stderrPipe[PIPE_WRITE]);
    return true;
  }
  else
  {
    close(stdinPipe[PIPE_READ]);
    close(stdinPipe[PIPE_WRITE]);
    close(stdoutPipe[PIPE_READ]);
    close(stdoutPipe[PIPE_WRITE]);
    close(stderrPipe[PIPE_READ]);
    close(stderrPipe[PIPE_WRITE]);
    printf("ERROR: Failed to fork child\n");
    return false;
  }
}

bool FfmpegProcess::isProcessRunning()
{
  std::unique_lock<std::mutex> lock(processMutex);
  if (processPid == 0)
  {
    return false;
  }
  int status;
  int res = waitpid(processPid, &status, WNOHANG);
  if (res == 0)
  {
    return true;
  }
  else if (res == processPid)
  {
    return false;
  }
  else if ((res == -1) && (errno == ECHILD))
  {
    return false;
  }
  else
  {
    printf("ERROR: Failed to wait for child process\n");
    return false;
  }
}

void FfmpegProcess::waitForExit()
{
  if (processStdin != 0)
  {
    close(processStdin);
    processStdin = 0;
  }
  while (isRunning())
  {
    usleep(10000);
  }
}

void FfmpegProcess::writeStdin(uint8_t* data, uint32_t length)
{
  if (processStdin == 0)
  {
    printf("ERROR: Stdin has been closed\n");
    return;
  }
  ssize_t ret = write(processStdin, data, length); 
  if (ret != (int32_t)length)
  {
    printf("ERROR: Failed to write to process stdin\n");
  }
}

string FfmpegProcess::readStdout()
{
  return stdoutReader->getData();
}

string FfmpegProcess::readStderr()
{
  return stderrReader->getData();
}

void FfmpegProcess::terminateProcess()
{
  kill(processPid, SIGKILL);
}

void FfmpegProcess::cleanUpProcess()
{
  if (processStdin != 0)
  {
    close(processStdin);
    processStdin = 0;
  }
  if (processStdout != 0)
  {
    close(processStdout);
    processStdout = 0;
  }
  if (processStderr != 0)
  {
    close(processStderr);
    processStderr = 0;
  }
}
