#include "RecordThread.h"
#include "FfmpegRecordProcess.h"
#include "PreviewSendThread.h"
#include <opencv2/core/core.hpp>
#include <opencv2/imgcodecs.hpp>
#include <opencv2/imgproc/imgproc.hpp>

using namespace std;
using namespace cv;

RecordThread::RecordThread(shared_ptr<Queue<shared_ptr<FrameWrapper>>> inputQueue,
    shared_ptr<Queue<shared_ptr<FrameWrapper>>> outputQueue, string ffmpeg, uint32_t wid,
    uint32_t hgt, uint32_t f, string output) :
  Thread("record"),
  inputFrameQueue(inputQueue),
  outputFrameQueue(outputQueue),
  ffmpegPath(ffmpeg),
  width(wid),
  height(hgt),
  fps(f),
  outputPath(output)
{
}

void RecordThread::setPreviewChannel(string name)
{
  unique_lock<mutex> lock(channelMutex);
  channelName = name;
}

uint32_t RecordThread::run()
{
  // Spawn the ffmpeg process
  FfmpegRecordProcess* ffmpegProcess = new FfmpegRecordProcess(ffmpegPath,
    width, height, fps, outputPath);
  ffmpegProcess->spawn();

  // Create the preview frame queue and spawn the preview send thread
  shared_ptr<Queue<shared_ptr<FrameWrapper>>> previewFrameQueue(
    new Queue<shared_ptr<FrameWrapper>>());
  PreviewSendThread* previewSendThread = new PreviewSendThread(previewFrameQueue,
    outputFrameQueue);
  previewSendThread->spawn();

  while (!checkForExit())
  {
    // Wait for the next frame
    shared_ptr<FrameWrapper> wrapper;
    if (!inputFrameQueue->waitItem(&wrapper, 10))
    {
      continue;
    }

    // Use the resized frame if one exists or the full frame otherwise
    uint8_t* data;
    uint32_t length;
    if (wrapper->nativeFrame != 0)
    {
      data = wrapper->nativeFrame;
      length = wrapper->nativeLength;
    }
    else
    {
      data = wrapper->electronFrame;
      length = wrapper->electronLength;
    }

    // Write the raw frame to the ffmpeg process
    if (!ffmpegProcess->writeStdin(data, length))
    {
      printf("[FrameThread] ERROR: Failed to write to FFmpeg\n");
      break;
    }

    // Pass the preview channel name and frame to the send thread
    {
      unique_lock<mutex> lock(channelMutex);
      if (!channelName.empty())
      {
        previewSendThread->setPreviewChannel(channelName);
        channelName.clear();
      }
    }
    previewFrameQueue->addItem(wrapper);
  }

  // Stop ffmpeg and the preview send thread
  if (ffmpegProcess->isProcessRunning())
  {
    ffmpegProcess->waitForExit();
  }
  delete ffmpegProcess;
  if (previewSendThread->isRunning())
  {
    previewSendThread->terminate();
  }
  delete previewSendThread;
  previewFrameQueue = nullptr;
  return 0;
}
