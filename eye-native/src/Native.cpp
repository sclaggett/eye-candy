#include "Native.h"
#include "CalibrationThread.h"
#include "Platform.h"
#include "PlaybackThread.h"
#include "PreviewReceiveThread.h"
#include "RecordThread.h"
#include <opencv2/imgcodecs.hpp>
#include <opencv2/imgproc/imgproc.hpp>
#include <stdio.h>

using namespace std;
using namespace cv;

// Global variables
string gFfmpegPath, gFfprobePath;
wrapper::JsCallback* gLogCallback = 0;
bool gInitialized = false, gRecording = false, gPlaying = false, gCalibrating = false;
uint32_t gNextFrameId = 0, gWidth = 0, gHeight = 0;
shared_ptr<Queue<shared_ptr<FrameWrapper>>> gPendingFrameQueue(new Queue<shared_ptr<FrameWrapper>>());
shared_ptr<Queue<shared_ptr<FrameWrapper>>> gCompletedFrameQueue(new Queue<shared_ptr<FrameWrapper>>());
shared_ptr<Queue<Mat*>> gPendingPreviewQueue(new Queue<Mat*>());
shared_ptr<RecordThread> gRecordThread(nullptr);
shared_ptr<PlaybackThread> gPlaybackThread(nullptr);
shared_ptr<PreviewReceiveThread> gPreviewReceiveThread(nullptr);
shared_ptr<CalibrationThread> gCalibrationThread(nullptr);

void native::initialize(Napi::Env env, string ffmpegPath, string ffprobePath,
  wrapper::JsCallback* logCallback)
{
  // Remember the location of ffmpeg and ffprobe and the log callback
  gFfmpegPath = ffmpegPath;
  gFfprobePath = ffprobePath;
  gLogCallback = logCallback;
  gInitialized = true;
}

string native::createVideoOutput(Napi::Env env, int width, int height, int fps, string outputPath)
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
  gWidth = width;
  gHeight = height;

  // Spawn the recording thread that will create the ffmpeg process, feed it frames as
  // we place them in the pending frames queue, optionally transmit those frames to the
  // renderer process, and finally move them into the completed frames queue
  gRecordThread = shared_ptr<RecordThread>(new RecordThread(gPendingFrameQueue,
    gCompletedFrameQueue, gFfmpegPath, gWidth, gHeight, fps, outputPath));
  gRecordThread->spawn();

  gRecording = true;
  return "";
}

int32_t native::queueNextFrame(Napi::Env env, uint8_t* frame, size_t length, int width,
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

  // Wrap the incoming frame, resize it if it's too large, and place it in the queue for
  // the pipeline to process
  shared_ptr<FrameWrapper> wrapper = shared_ptr<FrameWrapper>(new FrameWrapper(gNextFrameId++));
  wrapper->electronFrame = frame;
  wrapper->electronLength = length;
  wrapper->electronWidth = width;
  wrapper->electronHeight = height;
  if ((width != (int)gWidth) || (height != (int)gHeight))
  {
    Mat fullFrame(height, width, CV_8UC4, frame);
    Mat resizedFrame;
    resize(fullFrame, resizedFrame, Size2i(gWidth, gHeight), 0, 0, INTER_AREA);
    wrapper->nativeLength = resizedFrame.total() * resizedFrame.elemSize();
    wrapper->nativeFrame = new uint8_t[wrapper->nativeLength];
    memcpy(wrapper->nativeFrame, resizedFrame.data, wrapper->nativeLength);
    wrapper->nativeWidth = gWidth;
    wrapper->nativeHeight = gHeight;
  }
  gPendingFrameQueue->addItem(wrapper);
  return wrapper->number;
}

vector<int32_t> native::checkCompletedFrames(Napi::Env env)
{
  // Return an array of all frames that we're done with and free the associated memory
  vector<int32_t> ret;
  shared_ptr<FrameWrapper> wrapper;
  while (gCompletedFrameQueue->waitItem(&wrapper, 0))
  {
    ret.push_back(wrapper->number);
  }
  return ret;
}

void native::closeVideoOutput(Napi::Env env)
{
  if (!gRecording)
  {
    return;
  }
  if (gRecordThread != nullptr)
  {
    if (gRecordThread->isRunning())
    {
      gRecordThread->terminate();
    }
    gRecordThread = nullptr;
  }
  gRecording = false;
}

string native::beginVideoPlayback(Napi::Env env, int32_t x, int32_t y,
  vector<string> videos, bool scaleToFit, wrapper::JsCallback* durationCallback,
  wrapper::JsCallback* positionCallback, wrapper::JsCallback* delayCallback)
{
  // Make sure we've been initialized and aren't currently playing
  if (!gInitialized)
  {
    return "Library has not been initialized";
  }
  if (gPlaying)
  {
    return "Playback already in progress";
  }

  // Spawn the playback thread that will create the ffmpeg processes, read the
  // frames as they are decoded, and store then in the pending frames queue
  gPlaybackThread = shared_ptr<PlaybackThread>(new PlaybackThread(x, y,
    videos, scaleToFit, gFfmpegPath, gFfprobePath, gLogCallback,
    durationCallback, positionCallback, delayCallback));
  gPlaybackThread->spawn();

  gPlaying = true;
  return "";
}

string native::endVideoPlayback(Napi::Env env)
{
  if (!gPlaying)
  {
    return "";
  }
  if (gPlaybackThread != nullptr)
  {
    if (gPlaybackThread->isRunning())
    {
      gPlaybackThread->terminate();
    }
    gPlaybackThread = nullptr;
  }
  gPlaying = false;
  return "";
}

vector<uint32_t> native::getDisplayFrequencies(Napi::Env env, int32_t x, int32_t y)
{
  return platform::getDisplayFrequencies(x, y);
}

string native::createPreviewChannel(Napi::Env env, string& channelName)
{
  // Make sure either the record or playback threads are running
  if ((gRecordThread == nullptr) && (gPlaybackThread == nullptr))
  {
    return "Create video input or output before preview channel";
  }

  // Generate a unique pipe name and pass it to the record or playback threads
  if (!platform::generateUniquePipeName(channelName))
  {
    return "Failed to create uniquely named pipe";
  }
  if (gRecordThread != nullptr)
  {
    gRecordThread->setPreviewChannel(channelName);
  }
  if (gPlaybackThread != nullptr)
  {
    gPlaybackThread->setPreviewChannel(channelName);
  }
  return "";
}

string native::openPreviewChannel(Napi::Env env, string name)
{
  // Spawn the thread that will read frames from the remote frame thread
  gPreviewReceiveThread = shared_ptr<PreviewReceiveThread>(
    new PreviewReceiveThread(name, gPendingPreviewQueue));
  gPreviewReceiveThread->spawn();
  return "";
}

bool native::getNextFrame(Napi::Env env, uint8_t*& frame, size_t& length,
  int maxWidth, int maxHeight)
{
  // Get all preview frames in the queue and discarding everything except the most
  // recent frame. Return false if no frames are available
  vector<Mat*> allFrames = gPendingPreviewQueue->waitAllItems(0);
  if (allFrames.size() == 0)
  {
    return false;
  }
  Mat* previewFrame = allFrames[allFrames.size() - 1];
  uint32_t discardCount = 0;
  for (uint32_t i = 0; i < (allFrames.size() - 1); ++i)
  {
    Mat* tempFrame = allFrames[i];
    delete tempFrame;
    discardCount += 1;
  }

  // Use the standard approach to calculate the scaled size of the preview frame
  double frameRatio = (double)previewFrame->cols / (double)previewFrame->rows;
  double maxRatio = (double)maxWidth / (double)maxHeight;
  uint32_t width, height;
  if (frameRatio > maxRatio)
  {
    width = maxWidth;
    height = (uint32_t)((double)previewFrame->rows * (double)maxWidth /
      (double)previewFrame->cols);
  }
  else
  {
    height = maxHeight;
    width = (uint32_t)((double)previewFrame->cols * (double)maxHeight /
      (double)previewFrame->rows);
  }

  // Resize the preview frame and export it in the PNG format
  Mat resizedFrame;
  resize(*previewFrame, resizedFrame, Size2i(width, height), 0, 0,
    INTER_LINEAR);
  vector<uchar> pngFrame;
  imencode(".png", resizedFrame, pngFrame);

  // Create a copy of the PNG frame data and delete the preview frame
  length = pngFrame.size();
  frame = new uint8_t[length];
  memcpy(frame, &pngFrame[0], length);
  delete previewFrame;
  return true;
}

void native::closePreviewChannel(Napi::Env env)
{
  if (gPreviewReceiveThread != nullptr)
  {
    if (gPreviewReceiveThread->isRunning())
    {
      gPreviewReceiveThread->terminate();
    }
    gPreviewReceiveThread = nullptr;
  }
}

void native::deletePreviewFrame(napi_env env, void* finalize_data, void* finalize_hint)
{
  delete[] reinterpret_cast<uint8_t*>(finalize_data);
}

string native::beginCalibration(Napi::Env env, int32_t x, int32_t y,
  wrapper::JsCallback* noSignalJsCallback, wrapper::JsCallback* avgLatencyJsCallback)
{
  // Make sure we've been initialized and aren't currently calibrating
  if (!gInitialized)
  {
    return "Library has not been initialized";
  }
  if (gCalibrating)
  {
    return "Calibration already in progress";
  }

  // Spawn the calibration thread that will generate a series of black and white frames
  // and use them to measure the latency in the projection system
  gCalibrationThread = shared_ptr<CalibrationThread>(new CalibrationThread(x, y,
    gLogCallback, noSignalJsCallback, avgLatencyJsCallback));
  gCalibrationThread->spawn();

  gCalibrating = true;
  return "";
}

void native::endCalibration(Napi::Env env)
{
  if (!gCalibrating)
  {
    return;
  }
  if (gCalibrationThread != nullptr)
  {
    if (gCalibrationThread->isRunning())
    {
      gCalibrationThread->terminate();
    }
    gCalibrationThread = nullptr;
  }
  gCalibrating = false;
}
