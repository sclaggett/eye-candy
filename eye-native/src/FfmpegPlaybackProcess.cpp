#include "FfmpegPlaybackProcess.h"
#include "Platform.h"
#include <stdexcept>

using namespace std;

FfmpegPlaybackProcess::FfmpegPlaybackProcess(string exec, string videoPath,
    uint32_t w, uint32_t h) :
  Thread("ffmpegplayback"),
  executable(exec),
  width(w),
  height(h)
{
  arguments.push_back("-i");
  arguments.push_back(videoPath);

  arguments.push_back("-f");
  arguments.push_back("image2pipe");

  arguments.push_back("-pix_fmt");
  arguments.push_back("bgra");

  arguments.push_back("-vcodec");
  arguments.push_back("rawvideo");

  arguments.push_back("pipe:1");
}

FfmpegPlaybackProcess::~FfmpegPlaybackProcess()
{
  if (stdoutReader)
  {
    stdoutReader->terminate();
  }
  if (stderrReader)
  {
    stderrReader->terminate();
  }
  cleanUpProcess();
}

uint32_t FfmpegPlaybackProcess::run()
{
  if (!startProcess())
  {
    return 1;
  }
  uint32_t frameSize = width * height * 4;
  stdoutReader = shared_ptr<PipeReader>(new PipeReader("ffmpegplayback_stdout",
    processStdout, 5 * frameSize));
  stderrReader = shared_ptr<PipeReader>(new PipeReader("ffmpegplayback_stderr",
    processStderr));
  if (!stdoutReader->spawn() || !stderrReader->spawn())
  {
    fprintf(stderr, "[FfmpegPlaybackProcess] ERROR: Failed to spawn reader threads\n");
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
      fprintf(stderr, "[FfmpegPlaybackProcess] ERROR: A process thread has exited unexpectedly\n");
      break;
    }
    if (checkForExit())
    {
      terminateProcess();
      break;
    }
    platform::sleep(10);
    string data = stderrReader->getData();
    if (!data.empty())
    {
      vector<string> lines = splitString(data, "\n");
      for (auto it = lines.begin(); it != lines.end(); ++it)
      {
        fprintf(stderr, "[ffmpeg.stderr] %s\n", (*it).c_str());
      }
    }
  }
  return 0;
}

bool FfmpegPlaybackProcess::startProcess()
{
  return platform::spawnProcess(executable, arguments, processPid, processStdin,
    processStdout, processStderr);
}

bool FfmpegPlaybackProcess::isProcessRunning()
{
  std::unique_lock<std::mutex> lock(processMutex);
  if (processPid == 0)
  {
    return false;
  }
  return platform::isProcessRunning(processPid);
}

void FfmpegPlaybackProcess::waitForExit()
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

string FfmpegPlaybackProcess::readStdout()
{
  if (stdoutReader)
  {
    return stdoutReader->getData();
  }
  else
  {
    return "";
  }
}

void FfmpegPlaybackProcess::terminateProcess()
{
  platform::terminateProcess(processPid, 1);
}

void FfmpegPlaybackProcess::cleanUpProcess()
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

vector<string> FfmpegPlaybackProcess::splitString(string str, string sep)
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
