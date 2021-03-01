#include "Native.h"
#include "FfmpegProcess.h"
#include "FrameThread.h"
#include "Platform.h"
#include "PreviewThread.h"
#include "Wrapper.h"
#include <opencv2/imgcodecs.hpp>
#include <opencv2/imgproc/imgproc.hpp>
#include <stdio.h>

using namespace std;
using namespace cv;

// Global variables
string gFfmpegPath;
bool gInitialized = false, gRecording = false;
uint32_t gNextFrameId = 0;
shared_ptr<Queue<FrameWrapper*>> gPendingFrameQueue(new Queue<FrameWrapper*>());
shared_ptr<Queue<FrameWrapper*>> gCompletedFrameQueue(new Queue<FrameWrapper*>());
shared_ptr<FfmpegProcess> gFfmpegProcess(nullptr);
shared_ptr<FrameThread> gFrameThread(nullptr);
shared_ptr<Queue<Mat*>> gPreviewFrameQueue(new Queue<Mat*>());
shared_ptr<PreviewThread> gPreviewThread(nullptr);

void native::initializeFfmpeg(Napi::Env env, string ffmpegPath)
{
  // Remember the location of ffmpeg
  gFfmpegPath = ffmpegPath;
  gInitialized = true;
}

string native::createVideoOutput(Napi::Env env, int width, int height, int fps, string encoder,
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

  // Wrap the incoming frame and place it in the queue for the thread to process
  FrameWrapper* wrapper = new FrameWrapper;
  wrapper->frame = frame;
  wrapper->length = length;
  wrapper->width = width;
  wrapper->height = height;
  wrapper->id = gNextFrameId++;
  gPendingFrameQueue->addItem(wrapper);
  return wrapper->id;
}

vector<int32_t> native::checkCompletedFrames(Napi::Env env)
{
  // Return an array of all frames that we're done with and free the associated memory
  vector<int32_t> ret;
  FrameWrapper* wrapper;
  while (gCompletedFrameQueue->waitItem(&wrapper, 0))
  {
    ret.push_back(wrapper->id);
    delete wrapper;
  }
  return ret;
}

void native::closeVideoOutput(Napi::Env env)
{
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

string native::createPreviewChannel(Napi::Env env, string& channelName)
{
  // Make sure the main thread is running
  if (gFrameThread == nullptr)
  {
    return "Create video output before preview channel";
  }

  // Generate a unique pipe name and pass it to the frame thread
  if (!platform::generateUniquePipeName(channelName))
  {
    return "Failed to create uniquely named pipe";
  }
  gFrameThread->setPreviewChannel(channelName);
  return "";
}

string native::openPreviewChannel(Napi::Env env, string name)
{
  // Spawn the thread that will read frames from the remote frame thread
  gPreviewThread = shared_ptr<PreviewThread>(new PreviewThread(name,
    gPreviewFrameQueue));
  gPreviewThread->spawn();
  return "";
}

bool native::getNextFrame(Napi::Env env, uint8_t*& frame, size_t& length,
  int maxWidth, int maxHeight)
{
  // Get all preview frames in the queue and discarding everything except the most
  // recent frame. Return false if no frames are available
  vector<Mat*> allFrames = gPreviewFrameQueue->waitAllItems(0);
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
  if (gPreviewThread != nullptr)
  {
    if (gPreviewThread->isRunning())
    {
      gPreviewThread->terminate();
    }
    gPreviewThread = nullptr;
  }
}

void native::deletePreviewFrame(napi_env env, void* finalize_data, void* finalize_hint)
{
  delete[] reinterpret_cast<uint8_t*>(finalize_data);
}
