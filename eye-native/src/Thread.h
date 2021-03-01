#pragma once

#include <mutex>
#include <string>

class Thread
{
public:
  Thread(std::string name);
  virtual ~Thread() {};

  std::string spawn();
  bool isRunning();
  std::string terminate();

protected:
  void signalExit();
  bool checkForExit();
  void signalComplete();
  bool waitForCompletion(uint32_t timeout);

public:
  uint32_t runStart();
  virtual uint32_t run() = 0;

protected:
  std::string threadName;
  uint64_t threadId = 0;

private:
  bool threadRunning = false;
  bool threadExit = false;
  std::mutex threadMutex;
  std::condition_variable completeEvent;
};
