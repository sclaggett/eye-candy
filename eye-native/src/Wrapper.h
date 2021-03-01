// Wrapper.h: This file defines the functions that translate the JavaScript
// parameters and return values to and from C++. Everything is set up in the
// Init() function, called via index.js, and invoke the C++ functions
// from Native.h.

#include <napi.h>

namespace wrapper
{
  Napi::Object Init(Napi::Env env, Napi::Object exports);

  void initializeFfmpeg(const Napi::CallbackInfo& info);

  Napi::String createVideoOutput(const Napi::CallbackInfo& info);
  Napi::Number queueNextFrame(const Napi::CallbackInfo& info);
  Napi::Int32Array checkCompletedFrames(const Napi::CallbackInfo& info);
  void closeVideoOutput(const Napi::CallbackInfo& info);

  Napi::String createPreviewChannel(const Napi::CallbackInfo& info);
  Napi::String openPreviewChannel(const Napi::CallbackInfo& info);
  Napi::Value getNextFrame(const Napi::CallbackInfo& info);
  void closePreviewChannel(const Napi::CallbackInfo& info);
}
