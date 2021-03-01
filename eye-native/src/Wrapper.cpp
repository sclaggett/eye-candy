#include "Wrapper.h"
#include "FfmpegProcess.h"
#include "FrameThread.h"
#include "Native.h"
#include <stdio.h>

using namespace std;

Napi::Object wrapper::Init(Napi::Env env, Napi::Object exports)
{
  exports.Set("initializeFfmpeg", Napi::Function::New(env, wrapper::initializeFfmpeg));

  exports.Set("createVideoOutput", Napi::Function::New(env, wrapper::createVideoOutput));
  exports.Set("queueNextFrame", Napi::Function::New(env, wrapper::queueNextFrame));
  exports.Set("checkCompletedFrames", Napi::Function::New(env, wrapper::checkCompletedFrames));
  exports.Set("closeVideoOutput", Napi::Function::New(env, wrapper::closeVideoOutput));

  exports.Set("createPreviewChannel", Napi::Function::New(env, wrapper::createPreviewChannel));
  exports.Set("openPreviewChannel", Napi::Function::New(env, wrapper::openPreviewChannel));
  exports.Set("getNextFrame", Napi::Function::New(env, wrapper::getNextFrame));
  exports.Set("closePreviewChannel", Napi::Function::New(env, wrapper::closePreviewChannel));
  return exports;
}

void wrapper::initializeFfmpeg(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  if ((info.Length() != 1) || !info[0].IsString())
  {
    Napi::TypeError::New(env, "Incorrect parameter type").ThrowAsJavaScriptException();
    return;
  }
  Napi::String ffmpegPath = info[0].As<Napi::String>();  
  native::initializeFfmpeg(env, ffmpegPath);
}

Napi::String wrapper::createVideoOutput(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  if ((info.Length() != 5) ||
    !info[0].IsNumber() ||
    !info[1].IsNumber() ||
    !info[2].IsNumber() ||
    !info[3].IsString() ||
    !info[4].IsString())
  {
    Napi::TypeError::New(env, "Incorrect parameter type").ThrowAsJavaScriptException();
    return Napi::String();
  }
  Napi::Number width = info[0].As<Napi::Number>();
  Napi::Number height = info[1].As<Napi::Number>();
  Napi::Number fps = info[2].As<Napi::Number>();
  Napi::String encoder = info[3].As<Napi::String>();
  Napi::String outputPath = info[4].As<Napi::String>();
  return Napi::String::New(env, native::createVideoOutput(env, width, height, fps,
    encoder, outputPath));
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
