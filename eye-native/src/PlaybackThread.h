#pragma once

#include <mutex>
#include "FfmpegProcess.h"
#include "FrameWrapper.h"
#include "Thread.h"
#include "Queue.hpp"

class RecordThread : public Thread
{
public:
  RecordThread(std::shared_ptr<Queue<FrameWrapper*>> pendingFrameQueue,
    std::shared_ptr<Queue<FrameWrapper*>> completedFrameQueue,
    std::string ffmpegPath, uint32_t width, uint32_t height, uint32_t fps,
    std::string outputPath);
  virtual ~RecordThread() {};

  uint32_t run();

  void setPreviewChannel(std::string channelName);

protected:
  bool writeAll(uint64_t file, const uint8_t* buffer, uint32_t length);

private:
  std::shared_ptr<Queue<FrameWrapper*>> pendingFrameQueue;
  std::shared_ptr<Queue<FrameWrapper*>> completedFrameQueue;
  std::string ffmpegPath;
  uint32_t width;
  uint32_t height;
  uint32_t fps;
  std::string outputPath;
  std::string previewChannelName;
  std::mutex previewChannelMutex;
};
