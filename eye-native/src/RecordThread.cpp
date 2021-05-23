#include "RecordThread.h"
#include "FrameHeader.h"
#include "Platform.h"
#include <opencv2/core/core.hpp>
#include <opencv2/imgcodecs.hpp>
#include <opencv2/imgproc/imgproc.hpp>

using namespace std;
using namespace cv;

// Define constants to keep track of the four states that a named pipe can be in
#define CHANNEL_CLOSED 0
#define CHANNEL_OPENING 1
#define CHANNEL_OPEN 2
#define CHANNEL_ERROR 3

RecordThread::RecordThread(shared_ptr<Queue<FrameWrapper*>> pendingQueue,
    shared_ptr<Queue<FrameWrapper*>> completedQueue, string ffmpeg, uint32_t wid,
    uint32_t hgt, uint32_t f, string output) :
  Thread("record"),
  pendingFrameQueue(pendingQueue),
  completedFrameQueue(completedQueue),
  ffmpegPath(ffmpeg),
  width(wid),
  height(hgt),
  fps(f),
  outputPath(output)
{
}

uint32_t RecordThread::run()
{
  // Spawn the ffmpeg process
  shared_ptr<FfmpegProcess> ffmpegProcess = shared_ptr<FfmpegProcess>(new FfmpegProcess(
    ffmpegPath, width, height, fps, outputPath));
  ffmpegProcess->spawn();

  uint32_t frameNumber = 0;
  uint32_t channelState = CHANNEL_CLOSED;
  uint64_t namedPipeId = 0;
  while (!checkForExit())
  {
    FrameWrapper* wrapper = 0;
    if (!pendingFrameQueue->waitItem(&wrapper, 50))
    {
      continue;
    }

    // Frames captured by the Electron framework are encoded in the BGRA colorspace and
    // may be larger than size of the stimulus window.
    Mat frame(wrapper->height, wrapper->width, CV_8UC4, wrapper->frame);
    if ((wrapper->width != width) || (wrapper->height != height))
    {
      Mat resizedFrame;
      resize(frame, resizedFrame, Size2i(width, height), 0, 0, INTER_AREA);
      frame = resizedFrame;
    }

    // Write the raw frame to the ffmpeg process
    uint32_t frameLength = frame.total() * frame.elemSize();
    if (!ffmpegProcess->writeStdin(frame.data, frameLength))
    {
      printf("[FrameThread] ERROR: Failed to write to FFmpeg\n");
      break;
    }

    // Create the preview channel
    if (channelState == CHANNEL_CLOSED)
    {
      unique_lock<mutex> lock(previewChannelMutex);
      if (!previewChannelName.empty())
      {
        bool opening = false;
        if (!platform::createNamedPipeForWriting(previewChannelName, namedPipeId,
          opening))
        {
          printf("[FrameThread] ERROR: Failed to create named pipe\n");
          channelState = CHANNEL_ERROR;
          continue;
        }
        if (namedPipeId != 0)
        {
          channelState = opening ? CHANNEL_OPENING : CHANNEL_OPEN;
        }
      }
    }

    // Check asynchronously if the renderer process has connected to the preview channel
    if (channelState == CHANNEL_OPENING)
    {
      bool opened = false;
      if (!platform::openNamedPipeForWriting(namedPipeId, opened))
      {
        printf("[FrameThread] ERROR: Named pipe connection failed\n");
        channelState = CHANNEL_ERROR;
        continue;
      }
      if (opened)
      {
        channelState = CHANNEL_OPEN;
      }
    }
    
    // Write the frame to the named pipe once the connection is established
    if (channelState == CHANNEL_OPEN)
    {
      string header = frameheader::format(frameNumber, width, height, frameLength);
      if (!writeAll(namedPipeId, (const uint8_t*)header.data(), header.size()) ||
        !writeAll(namedPipeId, (const uint8_t*)frame.data, frameLength))
      {
        channelState = CHANNEL_ERROR;
        continue;
      }
    }
    
    // Add the frame to the completed queue
    completedFrameQueue->addItem(wrapper);
    frameNumber += 1;
  }

  // Stop ffmpeg and close the preview channel
  if (ffmpegProcess->isProcessRunning())
  {
    ffmpegProcess->waitForExit();
  }
  if (channelState != CHANNEL_CLOSED)
  {
    platform::closeNamedPipeForWriting(previewChannelName, namedPipeId);
  }
  return 0;
}

void RecordThread::setPreviewChannel(string channelName)
{
  unique_lock<mutex> lock(previewChannelMutex);
  previewChannelName = channelName;
}

bool RecordThread::writeAll(uint64_t file, const uint8_t* buffer, uint32_t length)
{
  uint32_t bytesWritten = 0;
  while (bytesWritten < length)
  {
    int32_t ret = platform::write(file, buffer + bytesWritten, length - bytesWritten);
    if (ret == -1)
    {
      return false;
    }
    bytesWritten += ret;
  }
  return true;
}