#pragma once

#include <mutex>
#include "FrameWrapper.h"
#include "Thread.h"
#include "Queue.hpp"

class ProjectorThread : public Thread
{
public:
  ProjectorThread(int32_t x, int32_t y, uint32_t fps, bool scaleToFit,
    std::shared_ptr<Queue<FrameWrapper*>> inputFrameQueue,
    std::shared_ptr<Queue<FrameWrapper*>> outputFrameQueue);
  virtual ~ProjectorThread() {};

  uint32_t run();

private:
  int32_t x;
  int32_t y;
  uint32_t fps;
  bool scaleToFit;
  std::shared_ptr<Queue<FrameWrapper*>> inputFrameQueue;
  std::shared_ptr<Queue<FrameWrapper*>> outputFrameQueue;
};
