#pragma once

#include <mutex>
#include "FrameWrapper.h"
#include "Thread.h"
#include "Queue.hpp"
#include "Wrapper.h"

class ProjectorThread : public Thread
{
public:
  ProjectorThread(int32_t x, int32_t y, bool scaleToFit,
    std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> inputFrameQueue,
    std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> outputFrameQueue,
    wrapper::JsCallback* logCallback, wrapper::JsCallback* positionCallback);
  virtual ~ProjectorThread() {};

  uint32_t run();

private:
  int32_t x;
  int32_t y;
  bool scaleToFit;
  std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> inputFrameQueue;
  std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> outputFrameQueue;
  wrapper::JsCallback* logCallback;
  wrapper::JsCallback* positionCallback;
};
