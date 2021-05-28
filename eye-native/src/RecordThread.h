#pragma once

#include <mutex>
#include "FrameWrapper.h"
#include "Queue.hpp"
#include "Thread.h"

class RecordThread : public Thread
{
public:
  RecordThread(std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> inputFrameQueue,
    std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> outputFrameQueue,
    std::string ffmpegPath, uint32_t width, uint32_t height, uint32_t fps,
    std::string outputPath);
  virtual ~RecordThread() {};

  void setPreviewChannel(std::string channelName);

  uint32_t run();

private:
  std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> inputFrameQueue;
  std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> outputFrameQueue;
  std::string ffmpegPath;
  uint32_t width;
  uint32_t height;
  uint32_t fps;
  std::string outputPath;
  std::string channelName;
  std::mutex channelMutex;
};
