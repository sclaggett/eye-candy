#pragma once

#include <mutex>
#include "FrameWrapper.h"
#include "Thread.h"
#include "Queue.hpp"
#include "Wrapper.h"

class ProjectorThread : public Thread
{
public:
  ProjectorThread(int32_t x, int32_t y, bool scaleToFit, uint32_t refreshRate,
    std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> inputFrameQueue,
    std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> outputFrameQueue,
    wrapper::JsCallback* logCallback, wrapper::JsCallback* positionCallback,
    wrapper::JsCallback* delayCallback);
  virtual ~ProjectorThread() {};

  uint32_t run();

  bool terminate(uint32_t timeout = 100) override;

private:
  int32_t x;
  int32_t y;
  bool scaleToFit;
  uint32_t refreshRate;
  std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> inputFrameQueue;
  std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> outputFrameQueue;
  wrapper::JsCallback* logCallback;
  wrapper::JsCallback* positionCallback;
  wrapper::JsCallback* delayCallback;
};
