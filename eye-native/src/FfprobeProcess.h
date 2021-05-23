#pragma once

#include <condition_variable>
#include <memory>
#include <mutex>
#include <vector>
#include "PipeReader.h"
#include "Thread.h"

class FfprobeProcess : public Thread
{
public:
  FfprobeProcess(std::string executable, std::string videoPath);
  virtual ~FfprobeProcess() {};

public:
  bool isProcessRunning();
  void waitForExit();

  uint32_t getWidth();
  uint32_t getHeight();
  uint32_t getFps();
  uint32_t getFrameCount();

private:
  bool startProcess();
  void terminateProcess();
  void cleanUpProcess();
  std::vector<std::string> splitString(std::string str,std::string sep);

public:
  uint32_t run();

private:
  std::string executable;
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
  uint32_t width;
  uint32_t height;
  uint32_t fps;
  uint32_t frameCount;
};
