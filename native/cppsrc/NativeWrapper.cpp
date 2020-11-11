#include "NativeWrapper.h"
#include "FfmpegProcess.h"
#include "FrameThread.h"
#include <stdio.h>
extern "C"
{
  #include <libavcodec/avcodec.h>
  #include <libavformat/avformat.h>
  #include <libswscale/swscale.h>
}

using namespace std;

/*** Global variables ***/

string gFfmpegPath;
bool gInitialized = false, gRecording = false;
uint32_t gNextFrameId = 0;
shared_ptr<Queue<FrameWrapper*>> gPendingFrameQueue(new Queue<FrameWrapper*>());
shared_ptr<Queue<FrameWrapper*>> gCompletedFrameQueue(new Queue<FrameWrapper*>());
shared_ptr<FfmpegProcess> gFfmpegProcess(nullptr);
shared_ptr<FrameThread> gFrameThread(nullptr);

/*** Implementation functions ***/

void nativewrapper::initialize(Napi::Env env, string ffmpegPath)
{
  // Remember the location of ffmpeg
  gFfmpegPath = ffmpegPath;
  gInitialized = true;
}

string nativewrapper::open(Napi::Env env, int width, int height, int fps, string encoder,
  string outputPath)
{
  // Make sure we've been initialized and aren't currently recording
  if (!gInitialized)
  {
    return "Library has not been initialized";
  }
  if (gRecording)
  {
    return "Recording already in progress";
  }

  // Spawn the ffmpeg process
  gFfmpegProcess = shared_ptr<FfmpegProcess>(new FfmpegProcess(gFfmpegPath, width, height,
    fps, encoder, outputPath));
  gFfmpegProcess->spawn();

  // Spawn the thread that will feed frames to the ffmpeg process
  gFrameThread = shared_ptr<FrameThread>(new FrameThread(gFfmpegProcess, gPendingFrameQueue,
    gCompletedFrameQueue, width, height));
  gFrameThread->spawn();

  printf("## Native library open(%i, %i, %i, %s)\n", (uint32_t)width, (uint32_t)height,
    fps, outputPath.c_str());

  gRecording = true;
  return "";
}

int32_t nativewrapper::write(Napi::Env env, uint8_t* frame, size_t length, int width,
  int height)
{
  // Make sure we've been initialized and are recording
  if (!gInitialized)
  {
    return -1;
  }
  if (!gRecording)
  {
    return -1;
  }

  FrameWrapper* wrapper = new FrameWrapper;
  wrapper->frame = frame;
  wrapper->length = length;
  wrapper->width = width;
  wrapper->height = height;
  wrapper->id = gNextFrameId++;
  gPendingFrameQueue->addItem(wrapper);
  return wrapper->id;
}

vector<int32_t> nativewrapper::checkCompleted(Napi::Env env)
{
  vector<int32_t> ret;
  FrameWrapper* wrapper;
  while (gCompletedFrameQueue->waitItem(&wrapper, 0))
  {
    ret.push_back(wrapper->id);
    delete wrapper;
  }
  return ret;
}

void nativewrapper::close(Napi::Env env)
{
  printf("## Closing\n");
  if (!gRecording)
  {
    return;
  }
  if (gFrameThread != nullptr)
  {
    if (gFrameThread->isRunning())
    {
      gFrameThread->terminate();
    }
    gFrameThread = nullptr;
  }
  if (gFfmpegProcess != nullptr)
  {
    if (gFfmpegProcess->isProcessRunning())
    {
      gFfmpegProcess->waitForExit();
    }
    gFfmpegProcess = nullptr;
  }
  gRecording = false;
}

/*** Wrapper functions ***/

void nativewrapper::initializedWrapped(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  if ((info.Length() != 1) || !info[0].IsString())
  {
    Napi::TypeError::New(env, "Incorrect parameter type").ThrowAsJavaScriptException();
    return;
  }
  Napi::String ffmpegPath = info[0].As<Napi::String>();  
  nativewrapper::initialize(env, ffmpegPath);
}

Napi::String nativewrapper::openWrapped(const Napi::CallbackInfo& info)
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
  Napi::String returnValue = Napi::String::New(env,
    nativewrapper::open(env, width, height, fps, encoder, outputPath));
  return returnValue;  
}

Napi::Number nativewrapper::writeWrapped(const Napi::CallbackInfo& info)
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
  Napi::Number returnValue = Napi::Number::New(env,
    nativewrapper::write(env, frame.Data(), frame.Length(), width, height));
  return returnValue;
}

Napi::Int32Array nativewrapper::checkCompletedWrapped(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  vector<int> completedIds = nativewrapper::checkCompleted(env);
  Napi::Int32Array returnValue = Napi::Int32Array::New(env, completedIds.size());
  memcpy(returnValue.Data(), completedIds.data(), sizeof(int32_t) * completedIds.size());
  return returnValue;
}

void nativewrapper::closeWrapped(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  nativewrapper::close(env);
}

Napi::Object nativewrapper::Init(Napi::Env env, Napi::Object exports)
{
  exports.Set("initialize", Napi::Function::New(env, nativewrapper::initializedWrapped));
  exports.Set("open", Napi::Function::New(env, nativewrapper::openWrapped));
  exports.Set("write", Napi::Function::New(env, nativewrapper::writeWrapped));
  exports.Set("checkCompleted", Napi::Function::New(env, nativewrapper::checkCompletedWrapped));
  exports.Set("close", Napi::Function::New(env, nativewrapper::closeWrapped));
  return exports;
}
