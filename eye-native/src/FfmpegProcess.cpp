#include "FfmpegProcess.h"
#include "Platform.h"
#include <stdexcept>

using namespace std;

FfmpegProcess::FfmpegProcess(string exec, uint32_t width, uint32_t height, uint32_t fps,
    string outputPath) :
  Thread("ffmpeg"),
  executable(exec)
{
  // Check options using:
  //   ffmpeg -h encoder=libx264

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
  arguments.push_back("-c:v");
  arguments.push_back("libx264");

  arguments.push_back("-profile");
  arguments.push_back("high");

  arguments.push_back("-preset");
  arguments.push_back("veryfast");

  arguments.push_back("-crf");
  arguments.push_back("18");

  arguments.push_back("-pix_fmt");
  arguments.push_back("yuv420p");

  arguments.push_back("-y");
  
  arguments.push_back(outputPath);
}

uint32_t FfmpegProcess::run()
{
  if (!startProcess())
  {
    return 1;
  }
  stdoutReader = shared_ptr<PipeReader>(new PipeReader("ffmpeg_stdout",
    processStdout));
  stderrReader = shared_ptr<PipeReader>(new PipeReader("ffmpeg_stderr",
    processStderr));
  if (!stdoutReader->spawn() || !stderrReader->spawn())
  {
    printf("[FfmpegProcess] ERROR: Failed to spawn reader threads\n");
    return 1;
  }
  processMutex.lock();
  processStarted = true;
  processMutex.unlock();
  processStartEvent.notify_one();
  while (isProcessRunning())
  {
    if (!stdoutReader->isRunning() ||
      !stderrReader->isRunning())
    {
      printf("[FfmpegProcess] ERROR: A process thread has exited unexpectedly\n");
      break;
    }
    if (checkForExit())
    {
      terminateProcess();
      break;
    }
    platform::sleep(10);
    string data = stdoutReader->getData();
    if (!data.empty())
    {
      vector<string> lines = splitString(data, "\n");
      for (auto it = lines.begin(); it != lines.end(); ++it)
      {
        printf("[ffmpeg.stdout] %s\n", (*it).c_str());
      }
    }
    data = stderrReader->getData();
    if (!data.empty())
    {
      vector<string> lines = splitString(data, "\n");
      for (auto it = lines.begin(); it != lines.end(); ++it)
      {
        printf("[ffmpeg.stderr] %s\n", (*it).c_str());
      }
    }
  }
  stdoutReader->terminate();
  stderrReader->terminate();
  cleanUpProcess();
  return 0;
}

bool FfmpegProcess::startProcess()
{
  return platform::spawnProcess(executable, arguments, processPid, processStdin,
    processStdout, processStderr);
}

bool FfmpegProcess::isProcessRunning()
{
  std::unique_lock<std::mutex> lock(processMutex);
  if (processPid == 0)
  {
    return false;
  }
  return platform::isProcessRunning(processPid);
}

void FfmpegProcess::waitForExit()
{
  if (processStdin != 0)
  {
    platform::close(processStdin);
    processStdin = 0;
  }
  while (isRunning())
  {
    platform::sleep(10);
  }
}

bool FfmpegProcess::writeStdin(uint8_t* data, uint32_t length)
{
  if (processStdin == 0)
  {
    return false;
  }
  int bytesWritten = platform::write(processStdin, data, length);
  return ((bytesWritten >= 0) || ((uint32_t)bytesWritten == length));
}

void FfmpegProcess::terminateProcess()
{
  platform::terminateProcess(processPid, 1);
}

void FfmpegProcess::cleanUpProcess()
{
  if (processStdin != 0)
  {
    platform::close(processStdin);
    processStdin = 0;
  }
  if (processStdout != 0)
  {
    platform::close(processStdout);
    processStdout = 0;
  }
  if (processStderr != 0)
  {
    platform::close(processStderr);
    processStderr = 0;
  }
}

vector<string> FfmpegProcess::splitString(string str, string sep)
{
  vector<string> arr;
  char* cstr = const_cast<char*>(str.c_str());
  char* current = strtok(cstr, sep.c_str());
  while (current != NULL)
  {
    arr.push_back(current);
    current = strtok(NULL, sep.c_str());
  }
  return arr;
}
