#pragma once

#include <mutex>
#include "FrameWrapper.h"
#include "Thread.h"
#include "Queue.hpp"
#include "Wrapper.h"

class PlaybackThread : public Thread
{
public:
  PlaybackThread(uint32_t x, uint32_t y, std::vector<std::string> videos,
    bool scaleToFit, std::string ffmpegPath, std::string ffprobePath,
    wrapper::JsCallback* logCallback, wrapper::JsCallback* durationCallback,
    wrapper::JsCallback* positionCallback, wrapper::JsCallback* delayCallback);
  virtual ~PlaybackThread() {};

  void setPreviewChannel(std::string channelName);

  uint32_t run() override;

  bool terminate(uint32_t timeout = 100) override;

private:
  std::string formatDuration(uint32_t duration);

private:
  uint32_t x;
  uint32_t y;
  std::vector<std::string> videos;
  bool scaleToFit;
  std::string ffmpegPath;
  std::string ffprobePath;
  wrapper::JsCallback* logCallback;
  wrapper::JsCallback* durationCallback;
  wrapper::JsCallback* positionCallback;
  wrapper::JsCallback* delayCallback;
  std::string channelName;
  std::mutex channelMutex;
};
