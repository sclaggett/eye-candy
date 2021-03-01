#pragma once

#include <mutex>
#include <opencv2/core/core.hpp>
#include "Thread.h"
#include "Queue.hpp"

class PreviewThread : public Thread
{
public:
  PreviewThread(std::string channelName, std::shared_ptr<Queue<cv::Mat*>> previewQueue);
  virtual ~PreviewThread() {};

  uint32_t run();

protected:
  bool readAll(uint64_t file, uint8_t* buffer, uint32_t length);

private:
  std::string channelName;
  std::shared_ptr<Queue<cv::Mat*>> previewQueue;
};
