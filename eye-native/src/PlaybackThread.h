#pragma once

#include <mutex>
#include "FrameWrapper.h"
#include "Thread.h"
#include "Queue.hpp"
#include "Wrapper.h"

class PlaybackThread : public Thread
{
public:
  PlaybackThread(std::vector<std::string> videos,
    std::shared_ptr<Queue<FrameWrapper*>> outputFrameQueue,
    std::string ffmpegPath, std::string ffprobePath,
    wrapper::JsCallback* logCallback);
  virtual ~PlaybackThread() {};

  uint32_t run();

private:
  std::vector<std::string> videos;
  std::shared_ptr<Queue<FrameWrapper*>> outputFrameQueue;
  std::string ffmpegPath;
  std::string ffprobePath;
  wrapper::JsCallback* logCallback;
};
