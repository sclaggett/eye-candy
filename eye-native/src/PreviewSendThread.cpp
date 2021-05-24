#include "PreviewSendThread.h"
#include "FrameHeader.h"
#include "Platform.h"

using namespace std;

// Define constants to keep track of the four states that a named pipe can be in
#define CHANNEL_CLOSED 0
#define CHANNEL_OPENING 1
#define CHANNEL_OPEN 2
#define CHANNEL_ERROR 3

PreviewSendThread::PreviewSendThread(shared_ptr<Queue<FrameWrapper*>> inputQueue,
    shared_ptr<Queue<FrameWrapper*>> outputQueue) :
  Thread("previewsend"),
  inputFrameQueue(inputQueue),
  outputFrameQueue(outputQueue)
{
}

uint32_t PreviewSendThread::run()
{
  uint32_t frameNumber = 0;
  uint32_t channelState = CHANNEL_CLOSED;
  uint64_t namedPipeId = 0;
  while (!checkForExit())
  {
    FrameWrapper* wrapper = 0;
    if (!inputFrameQueue->waitItem(&wrapper, 50))
    {
      continue;
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
      if (wrapper->nativeFrame != 0)
      {
        string header = frameheader::format(frameNumber, wrapper->nativeWidth,
          wrapper->nativeHeight, wrapper->nativeLength);
        if (!writeAll(namedPipeId, (const uint8_t*)header.data(), header.size()) ||
          !writeAll(namedPipeId, (const uint8_t*)wrapper->nativeFrame, wrapper->nativeLength))
        {
          channelState = CHANNEL_ERROR;
          continue;
        }
      }
      else
      {
        string header = frameheader::format(frameNumber, wrapper->width, wrapper->height,
          wrapper->length);
        if (!writeAll(namedPipeId, (const uint8_t*)header.data(), header.size()) ||
          !writeAll(namedPipeId, (const uint8_t*)wrapper->frame, wrapper->length))
        {
          channelState = CHANNEL_ERROR;
          continue;
        }
      }
    }
    
    // Add the frame to the output queue or release the memory
    if (outputFrameQueue != 0)
    {
      outputFrameQueue->addItem(wrapper);
    }
    else
    {
      if (wrapper->nativeFrame != 0)
      {
        delete [] wrapper->nativeFrame;
        wrapper->nativeFrame = 0;
      }
      delete wrapper;
    }
    frameNumber += 1;
  }

  // Close the preview channel
  if (channelState != CHANNEL_CLOSED)
  {
    platform::closeNamedPipeForWriting(previewChannelName, namedPipeId);
  }
  return 0;
}

void PreviewSendThread::setPreviewChannel(string channelName)
{
  unique_lock<mutex> lock(previewChannelMutex);
  previewChannelName = channelName;
}

bool PreviewSendThread::writeAll(uint64_t file, const uint8_t* buffer, uint32_t length)
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
