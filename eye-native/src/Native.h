// Native.h: This file defines the C++ functions that make up the native library.
// They are invoked by the functions in Wrapper.h.

#include <napi.h>
#include <vector>
#include "Wrapper.h"

namespace native
{
  void initialize(Napi::Env env, std::string ffmpegPath,
    std::string ffprobePath, wrapper::JsCallback* logCallback);

  std::string createVideoOutput(Napi::Env env, int width, int height, int fps,
    std::string outputPath);
  int32_t queueNextFrame(Napi::Env env, uint8_t* frame, size_t length, int width,
    int height);
  std::vector<int32_t> checkCompletedFrames(Napi::Env env);
  void closeVideoOutput(Napi::Env env);

  std::string beginVideoPlayback(Napi::Env env, int32_t x, int32_t y,
    std::vector<std::string> videos, bool scaleToFit,
    wrapper::JsCallback* durationCallback, wrapper::JsCallback* positionCallback,
    wrapper::JsCallback* delayCallback);
  std::string endVideoPlayback(Napi::Env env);
  std::vector<uint32_t> getDisplayFrequencies(Napi::Env env, int32_t x, int32_t y);

  std::string createPreviewChannel(Napi::Env env, std::string& channelName);
  std::string openPreviewChannel(Napi::Env env, std::string name);
  bool getNextFrame(Napi::Env env, uint8_t*& frame, size_t& length, int maxWidth,
    int maxHeight);
  void closePreviewChannel(Napi::Env env);

  void deletePreviewFrame(napi_env env, void* finalize_data, void* finalize_hint);

  std::string beginCalibration(Napi::Env env, int32_t x, int32_t y,
    wrapper::JsCallback* noSignalJsCallback, wrapper::JsCallback* avgLatencyJsCallback);
  void endCalibration(Napi::Env env);
}
