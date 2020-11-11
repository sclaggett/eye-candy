#pragma once

#include "FfmpegProcess.h"
#include "Thread.h"
#include "Queue.hpp"

typedef struct {
  uint8_t* frame;
  size_t length;
  uint32_t width;
  uint32_t height;
  uint32_t id;
} FrameWrapper;

class FrameThread : public Thread
{
public:
  FrameThread(std::shared_ptr<FfmpegProcess> ffmpegProcess,
    std::shared_ptr<Queue<FrameWrapper*>> pendingFrameQueue,
    std::shared_ptr<Queue<FrameWrapper*>> completedFrameQueue, uint32_t width, uint32_t height);
  virtual ~FrameThread() {};

  void* run();

private:
  std::shared_ptr<FfmpegProcess> ffmpegProcess;
  std::shared_ptr<Queue<FrameWrapper*>> pendingFrameQueue;
  std::shared_ptr<Queue<FrameWrapper*>> completedFrameQueue;
  uint32_t width;
  uint32_t height;
};
