// Wrapper.h: This file defines the functions that translate the JavaScript
// parameters and return values to and from C++. Everything is set up in the
// Init() function, called via index.js, and invoke the C++ functions
// from Native.h.
#pragma once

#include <napi.h>

namespace wrapper
{
  Napi::Object Init(Napi::Env env, Napi::Object exports);

  struct JsCallback
  {
    Napi::ThreadSafeFunction function;
  };
  JsCallback* createJsCallback(Napi::Env env, Napi::Function callback);
  void invokeJsCallback(JsCallback* callback);
  void invokeJsCallback(JsCallback* callback, std::string result);
  void invokeJsCallback(JsCallback* callback, uint32_t result);
  void finalizeJsCallback(Napi::Env env, void *finalizeData,
    JsCallback* callback);

  void initialize(const Napi::CallbackInfo& info);

  Napi::String createVideoOutput(const Napi::CallbackInfo& info);
  Napi::Number queueNextFrame(const Napi::CallbackInfo& info);
  Napi::Int32Array checkCompletedFrames(const Napi::CallbackInfo& info);
  void closeVideoOutput(const Napi::CallbackInfo& info);

  Napi::String beginVideoPlayback(const Napi::CallbackInfo& info);
  Napi::String endVideoPlayback(const Napi::CallbackInfo& info);
  Napi::Int32Array getDisplayFrequencies(const Napi::CallbackInfo& info);

  Napi::String createPreviewChannel(const Napi::CallbackInfo& info);
  Napi::String openPreviewChannel(const Napi::CallbackInfo& info);
  Napi::Value getNextFrame(const Napi::CallbackInfo& info);
  void closePreviewChannel(const Napi::CallbackInfo& info);
}
