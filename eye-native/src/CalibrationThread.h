#pragma once

#include <list>
#include "Thread.h"
#include "Wrapper.h"

class CalibrationThread : public Thread
{
public:
  CalibrationThread(uint32_t x, uint32_t y, wrapper::JsCallback* errorCallback,
    wrapper::JsCallback* noSignalCallback, wrapper::JsCallback* avgLatencyCallback);
  virtual ~CalibrationThread() {};

  uint32_t run();

  bool terminate(uint32_t timeout = 100);

private:
  void addLatencyMeasurement(uint64_t latencyUsec);

private:
  uint32_t x;
  uint32_t y;
  wrapper::JsCallback* errorCallback;
  wrapper::JsCallback* noSignalCallback;
  wrapper::JsCallback* avgLatencyCallback;
  std::list<float> latencies;
};
