#pragma once

#include <condition_variable>
#include <memory>
#include <mutex>
#include <vector>
#include "PipeReader.h"
#include "Thread.h"

class FfmpegPlaybackProcess : public Thread
{
public:
  FfmpegPlaybackProcess(std::string executable, std::string videoPath,
    uint32_t width, uint32_t height);
  virtual ~FfmpegPlaybackProcess();

public:
  bool isProcessRunning();
  void waitForExit();
  void terminateProcess();

  std::string readStdout();

private:
  bool startProcess();
  void cleanUpProcess();
  std::vector<std::string> splitString(std::string str,std::string sep);

public:
  uint32_t run();

private:
  std::string executable;
  uint32_t width;
  uint32_t height;
  std::vector<std::string> arguments;
  bool processStarted = false;
  std::mutex processMutex;
  std::condition_variable processStartEvent;
  uint64_t processPid = 0;
  uint64_t processStdin = 0;
  uint64_t processStdout = 0;
  uint64_t processStderr = 0;
  std::shared_ptr<PipeReader> stdoutReader;
  std::shared_ptr<PipeReader> stderrReader;
};
