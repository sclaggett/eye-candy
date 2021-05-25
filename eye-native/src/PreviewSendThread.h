#pragma once

#include <mutex>
#include "FrameWrapper.h"
#include "Thread.h"
#include "Queue.hpp"

class PreviewSendThread : public Thread
{
public:
  PreviewSendThread(std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> inputFrameQueue,
    std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> outputFrameQueue);
  virtual ~PreviewSendThread() {};

  uint32_t run();

  void setPreviewChannel(std::string channelName);

protected:
  bool writeAll(uint64_t file, const uint8_t* buffer, uint32_t length);

private:
  std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> inputFrameQueue;
  std::shared_ptr<Queue<std::shared_ptr<FrameWrapper>>> outputFrameQueue;
  std::string previewChannelName;
  std::mutex previewChannelMutex;
};
