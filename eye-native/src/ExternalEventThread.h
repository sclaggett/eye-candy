#pragma once

#include <mutex>
#include "Thread.h"

class ExternalEventThread : public Thread
{
public:
  ExternalEventThread();
  virtual ~ExternalEventThread() {};

  uint64_t getEventTimestamp();

  uint32_t run();

private:
  uint64_t eventTimestamp;
  std::mutex timestampMutex;
};
