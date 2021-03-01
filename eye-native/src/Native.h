// Native.h: This file defines the C++ functions that make up the native library.
// They are invoked by the functions in Wrapper.h.

#include <napi.h>
#include <vector>

namespace native
{
  void initializeFfmpeg(Napi::Env env, std::string ffmpegPath);

  std::string createVideoOutput(Napi::Env env, int width, int height, int fps,
    std::string encoder, std::string outputPath);
  int32_t queueNextFrame(Napi::Env env, uint8_t* frame, size_t length, int width,
    int height);
  std::vector<int32_t> checkCompletedFrames(Napi::Env env);
  void closeVideoOutput(Napi::Env env);

  std::string createPreviewChannel(Napi::Env env, std::string& channelName);
  std::string openPreviewChannel(Napi::Env env, std::string name);
  bool getNextFrame(Napi::Env env, uint8_t*& frame, size_t& length, int maxWidth,
    int maxHeight);
  void closePreviewChannel(Napi::Env env);

  void deletePreviewFrame(napi_env env, void* finalize_data, void* finalize_hint);
}
