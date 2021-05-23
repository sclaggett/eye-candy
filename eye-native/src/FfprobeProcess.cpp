#include "FfprobeProcess.h"
#include "Platform.h"
#include "json/json.hpp"
#include <stdexcept>
#include <sstream>

using namespace std;
using json = nlohmann::json;

FfprobeProcess::FfprobeProcess(string exec, string videoPath) :
  Thread("ffprobe"),
  executable(exec),
  width(0),
  height(0),
  fps(0),
  frameCount(0)
{
  arguments.push_back("-v");
  arguments.push_back("quiet");

  arguments.push_back("-print_format");
  arguments.push_back("json");

  arguments.push_back("-show_streams");

  arguments.push_back(videoPath);
}

uint32_t FfprobeProcess::run()
{
  if (!startProcess())
  {
    return 1;
  }

  stdoutReader = shared_ptr<PipeReader>(new PipeReader("ffprobe_stdout",
    processStdout));
  stderrReader = shared_ptr<PipeReader>(new PipeReader("ffprobe_stderr",
    processStderr));
  if (!stdoutReader->spawn() || !stderrReader->spawn())
  {
    fprintf(stderr, "[FfprobeProcess] ERROR: Failed to spawn reader threads\n");
    return 1;
  }

  processMutex.lock();
  processStarted = true;
  processMutex.unlock();
  processStartEvent.notify_one();

  stringstream stdoutRaw;
  while (isProcessRunning())
  {
    if (!stdoutReader->isRunning() ||
      !stderrReader->isRunning())
    {
      fprintf(stderr, "[FfprobeProcess] ERROR: A process thread has exited unexpectedly\n");
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
      stdoutRaw << data;
    }
    data = stderrReader->getData();
    if (!data.empty())
    {
      vector<string> lines = splitString(data, "\n");
      for (auto it = lines.begin(); it != lines.end(); ++it)
      {
        fprintf(stderr, "[ffmpeg.stderr] %s\n", (*it).c_str());
      }
    }
  }
  stdoutReader->terminate();
  stderrReader->terminate();
  cleanUpProcess();

  json stdoutJson = json::parse(stdoutRaw.str());
  for (auto& stream : stdoutJson["streams"])
  {
    string codecType = stream["codec_type"].get<string>();
    if (stream["codec_type"] != "video")
    {
      continue;
    }
    width = stream["width"].get<uint32_t>();
    height = stream["height"].get<uint32_t>();
    string fpsStr = stream["r_frame_rate"].get<string>();  // e.g. "30/1"
    size_t slashPos = fpsStr.find('/');
    if (slashPos != string::npos)
    {
      fps = atoi(fpsStr.substr(0, slashPos).c_str());
    }
    string frameCountStr = stream["nb_frames"].get<string>(); // e.g. "902"
    frameCount = atoi(frameCountStr.c_str());
    break;
  }
  return 0;
}

bool FfprobeProcess::startProcess()
{
  return platform::spawnProcess(executable, arguments, processPid, processStdin,
    processStdout, processStderr);
}

bool FfprobeProcess::isProcessRunning()
{
  std::unique_lock<std::mutex> lock(processMutex);
  if (processPid == 0)
  {
    return false;
  }
  return platform::isProcessRunning(processPid);
}

void FfprobeProcess::waitForExit()
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

uint32_t FfprobeProcess::getWidth()
{
  return width;
}

uint32_t FfprobeProcess::getHeight()
{
  return height;
}

uint32_t FfprobeProcess::getFps()
{
  return fps;
}

uint32_t FfprobeProcess::getFrameCount()
{
  return frameCount;
}

void FfprobeProcess::terminateProcess()
{
  platform::terminateProcess(processPid, 1);
}

void FfprobeProcess::cleanUpProcess()
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

vector<string> FfprobeProcess::splitString(string str, string sep)
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
