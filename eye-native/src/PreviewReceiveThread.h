#pragma once

#include <mutex>
#include <opencv2/core/core.hpp>
#include "Thread.h"
#include "Queue.hpp"

class PreviewReceiveThread : public Thread
{
public:
  PreviewReceiveThread(std::string channelName, std::shared_ptr<Queue<cv::Mat*>> previewQueue);
  virtual ~PreviewReceiveThread() {};

  uint32_t run();

protected:
  bool readAll(uint64_t file, uint8_t* buffer, uint32_t length, bool& closed);

private:
  std::string channelName;
  std::shared_ptr<Queue<cv::Mat*>> previewQueue;
};
