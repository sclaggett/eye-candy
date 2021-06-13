#include "Wrapper.h"
#include "Native.h"
#include <stdio.h>

using namespace std;

Napi::Object wrapper::Init(Napi::Env env, Napi::Object exports)
{
  exports.Set("initialize", Napi::Function::New(env, wrapper::initialize));

  exports.Set("createVideoOutput", Napi::Function::New(env, wrapper::createVideoOutput));
  exports.Set("queueNextFrame", Napi::Function::New(env, wrapper::queueNextFrame));
  exports.Set("checkCompletedFrames", Napi::Function::New(env, wrapper::checkCompletedFrames));
  exports.Set("closeVideoOutput", Napi::Function::New(env, wrapper::closeVideoOutput));

  exports.Set("beginVideoPlayback", Napi::Function::New(env, wrapper::beginVideoPlayback));
  exports.Set("endVideoPlayback", Napi::Function::New(env, wrapper::endVideoPlayback));
  exports.Set("getDisplayFrequencies", Napi::Function::New(env, wrapper::getDisplayFrequencies));

  exports.Set("createPreviewChannel", Napi::Function::New(env, wrapper::createPreviewChannel));
  exports.Set("openPreviewChannel", Napi::Function::New(env, wrapper::openPreviewChannel));
  exports.Set("getNextFrame", Napi::Function::New(env, wrapper::getNextFrame));
  exports.Set("closePreviewChannel", Napi::Function::New(env, wrapper::closePreviewChannel));
  return exports;
}

wrapper::JsCallback* wrapper::createJsCallback(Napi::Env env,
  Napi::Function callback)
{
  wrapper::JsCallback* jsCallback = new JsCallback();
  jsCallback->function = Napi::ThreadSafeFunction::New(env, callback, "JSCB",
    0, 1, jsCallback, wrapper::finalizeJsCallback, (void*)nullptr);
  return jsCallback;
}

void wrapper::invokeJsCallback(wrapper::JsCallback* callback)
{
  auto helperFunction = [](Napi::Env env, Napi::Function jsCallback)
  {
    jsCallback.Call({});
  };
  napi_status status = callback->function.BlockingCall(helperFunction);
  if (status != napi_ok) {
    Napi::Error::Fatal("ThreadEntry",
      "Napi::ThreadSafeNapi::Function.BlockingCall() failed");
  }
}

void wrapper::invokeJsCallback(wrapper::JsCallback* callback, string result)
{
  auto helperFunction = [](Napi::Env env, Napi::Function jsCallback,
    string* data)
  {
    jsCallback.Call({Napi::String::New(env, *data)});
    delete data;
  };

  string* strResult = new string(result);
  napi_status status = callback->function.NonBlockingCall(strResult,
    helperFunction);
  if (status != napi_ok) {
    Napi::Error::Fatal("ThreadEntry",
      "Napi::ThreadSafeNapi::Function.BlockingCall() failed");
  }
}

void wrapper::invokeJsCallback(JsCallback* callback, uint32_t result)
{
  auto helperFunction = [](Napi::Env env, Napi::Function jsCallback,
    uint32_t* data)
  {
    jsCallback.Call({Napi::Number::New(env, *data)});
    delete data;
  };

  uint32_t* intResult = new uint32_t();
  *intResult = result;
  napi_status status = callback->function.NonBlockingCall(intResult,
    helperFunction);
  if (status != napi_ok) {
    Napi::Error::Fatal("ThreadEntry",
      "Napi::ThreadSafeNapi::Function.BlockingCall() failed");
  }
}

void wrapper::finalizeJsCallback(Napi::Env env, void *finalizeData,
  wrapper::JsCallback* callback)
{
  delete callback;
}

void wrapper::initialize(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  if ((info.Length() != 3) ||
    !info[0].IsString() ||
    !info[1].IsString() ||
    !info[2].IsFunction())
  {
    Napi::TypeError::New(env, "Incorrect parameter type").ThrowAsJavaScriptException();
    return;
  }
  Napi::String ffmpegPath = info[0].As<Napi::String>();
  Napi::String ffprobePath = info[1].As<Napi::String>();
  Napi::Function logCallback = info[2].As<Napi::Function>();
  wrapper::JsCallback* logJsCallback = createJsCallback(env, logCallback);
  native::initialize(env, ffmpegPath, ffprobePath, logJsCallback);
}

Napi::String wrapper::createVideoOutput(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  if ((info.Length() != 4) ||
    !info[0].IsNumber() ||
    !info[1].IsNumber() ||
    !info[2].IsNumber() ||
    !info[3].IsString())
  {
    Napi::TypeError::New(env, "Incorrect parameter type").ThrowAsJavaScriptException();
    return Napi::String();
  }
  Napi::Number width = info[0].As<Napi::Number>();
  Napi::Number height = info[1].As<Napi::Number>();
  Napi::Number fps = info[2].As<Napi::Number>();
  Napi::String outputPath = info[3].As<Napi::String>();
  return Napi::String::New(env, native::createVideoOutput(env, width, height, fps,
    outputPath));
}

Napi::Number wrapper::queueNextFrame(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  if ((info.Length() != 3) ||
    !info[0].IsBuffer() ||
    !info[1].IsNumber() ||
    !info[2].IsNumber())
  {
    Napi::TypeError::New(env, "Incorrect parameter type").ThrowAsJavaScriptException();
    return Napi::Number::New(env, -1);
  }
  Napi::TypedArray typedArray = info[0].As<Napi::TypedArray>();
  if (typedArray.TypedArrayType() != napi_uint8_array)
  {
    Napi::TypeError::New(env, "Unexpected buffer type").ThrowAsJavaScriptException();
    return Napi::Number::New(env, -1);
  }
  Napi::Buffer<uint8_t> frame = info[0].As<Napi::Buffer<uint8_t>>();
  Napi::Number width = info[1].As<Napi::Number>();
  Napi::Number height = info[2].As<Napi::Number>();
  return Napi::Number::New(env, native::queueNextFrame(env, frame.Data(), frame.Length(),
    width, height));
}

Napi::Int32Array wrapper::checkCompletedFrames(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  vector<int> completedIds = native::checkCompletedFrames(env);
  Napi::Int32Array returnValue = Napi::Int32Array::New(env, completedIds.size());
  memcpy(returnValue.Data(), completedIds.data(), sizeof(int32_t) * completedIds.size());
  return returnValue;
}

void wrapper::closeVideoOutput(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  native::closeVideoOutput(env);
}

Napi::String wrapper::beginVideoPlayback(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  if ((info.Length() != 7) ||
    !info[0].IsNumber() ||
    !info[1].IsNumber() ||
    !info[2].IsArray() ||
    !info[3].IsBoolean() ||
    !info[4].IsFunction() ||
    !info[5].IsFunction() ||
    !info[6].IsFunction())
  {
    Napi::TypeError::New(env, "Incorrect parameter type").ThrowAsJavaScriptException();
    return Napi::String();
  }
  Napi::Number x = info[0].As<Napi::Number>();
  Napi::Number y = info[1].As<Napi::Number>();
  Napi::Array videosArray = info[2].As<Napi::Array>();
  vector<string> videos;
  for (uint32_t i = 0; i < videosArray.Length(); i++)
  {
    Napi::Value value = videosArray[i];
    string video = value.ToString().Utf8Value();
    videos.push_back(video);
  }
  bool scaleToFit = info[3].As<Napi::Boolean>();
  Napi::Function durationCallback = info[4].As<Napi::Function>();
  wrapper::JsCallback* durationJsCallback = createJsCallback(env, durationCallback);
  Napi::Function positionCallback = info[5].As<Napi::Function>();
  wrapper::JsCallback* positionJsCallback = createJsCallback(env, positionCallback);
  Napi::Function delayCallback = info[6].As<Napi::Function>();
  wrapper::JsCallback* delayJsCallback = createJsCallback(env, delayCallback);
  return Napi::String::New(env, native::beginVideoPlayback(env, x, y, videos, scaleToFit,
    durationJsCallback, positionJsCallback, delayJsCallback));
}

Napi::String wrapper::endVideoPlayback(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  return Napi::String::New(env, native::endVideoPlayback(env));
}

Napi::Int32Array wrapper::getDisplayFrequencies(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  if ((info.Length() != 2) ||
    !info[0].IsNumber() ||
    !info[1].IsNumber())
  {
    Napi::TypeError::New(env, "Incorrect parameter type").ThrowAsJavaScriptException();
    vector<uint32_t> empty;
    return Napi::Int32Array::New(env, 0);
  }
  Napi::Number x = info[0].As<Napi::Number>();
  Napi::Number y = info[1].As<Napi::Number>();
  vector<uint32_t> displayFrequencies = native::getDisplayFrequencies(env, x, y);
  Napi::Int32Array returnValue = Napi::Int32Array::New(env, displayFrequencies.size());
  memcpy(returnValue.Data(), displayFrequencies.data(), sizeof(uint32_t) * displayFrequencies.size());
  return returnValue;
}

Napi::String wrapper::createPreviewChannel(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  string channelName;
  string error = native::createPreviewChannel(env, channelName);
  if (!error.empty())
  {
    Napi::TypeError::New(env, error).ThrowAsJavaScriptException();
    return Napi::String();
  }
  return Napi::String::New(env, channelName);
}

Napi::String wrapper::openPreviewChannel(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  if ((info.Length() != 1) || !info[0].IsString())
  {
    Napi::TypeError::New(env, "Incorrect parameter type").ThrowAsJavaScriptException();
    return Napi::String();
  }
  Napi::String name = info[0].As<Napi::String>();  
  return Napi::String::New(env, native::openPreviewChannel(env, name));
}

Napi::Value wrapper::getNextFrame(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  if ((info.Length() != 2) ||
    !info[0].IsNumber() ||
    !info[1].IsNumber())
  {
    Napi::TypeError::New(env, "Incorrect parameter type").ThrowAsJavaScriptException();
    return env.Null();
  }
  Napi::Number maxWidth = info[0].As<Napi::Number>();
  Napi::Number maxHeight = info[1].As<Napi::Number>();
  uint8_t* frame = nullptr;
  size_t length = 0;
  if (!native::getNextFrame(env, frame, length, maxWidth, maxHeight))
  {
    return env.Null();
  }
  napi_value output_buffer;
  napi_status status = napi_create_external_arraybuffer(env, frame, length,
    native::deletePreviewFrame, NULL, &output_buffer);
  if (status != napi_ok)
  {
    Napi::TypeError::New(env, "Failed to create buffer").ThrowAsJavaScriptException();
    return env.Null();
  }
  napi_value output_array;
  status = napi_create_typedarray(env, napi_uint8_array, length, output_buffer, 0,
    &output_array);
  if (status != napi_ok)
  {
    Napi::TypeError::New(env, "Failed to create typed array").ThrowAsJavaScriptException();
    return env.Null();
  }
  return Napi::Value(env, output_array);
}

void wrapper::closePreviewChannel(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  native::closePreviewChannel(env);
}
