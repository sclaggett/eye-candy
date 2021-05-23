#pragma once

#include <mutex>
#include "FfmpegProcess.h"
#include "FrameWrapper.h"
#include "Thread.h"
#include "Queue.hpp"

class RecordThread : public Thread
{
public:
  RecordThread(std::shared_ptr<Queue<FrameWrapper*>> inputFrameQueue,
    std::shared_ptr<Queue<FrameWrapper*>> outputFrameQueue,
    std::string ffmpegPath, uint32_t width, uint32_t height, uint32_t fps,
    std::string outputPath);
  virtual ~RecordThread() {};

  uint32_t run();

private:
  std::shared_ptr<Queue<FrameWrapper*>> inputFrameQueue;
  std::shared_ptr<Queue<FrameWrapper*>> outputFrameQueue;
  std::string ffmpegPath;
  uint32_t width;
  uint32_t height;
  uint32_t fps;
  std::string outputPath;
};
