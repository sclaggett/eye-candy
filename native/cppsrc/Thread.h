#pragma once

#include <condition_variable>
#include <memory>
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
  void* runStart();
  virtual void* run() = 0;

  static void* runHelper(void* context);

protected:
  std::string threadName;
  pthread_t threadId = 0;

private:
  bool threadRunning = false;
  bool threadExit = false;
  std::mutex threadMutex;
  std::condition_variable completeEvent;
};
