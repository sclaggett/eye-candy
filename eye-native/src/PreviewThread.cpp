#include "PreviewThread.h"
#include "FrameHeader.h"
#include "Platform.h"

using namespace std;
using namespace cv;

PreviewThread::PreviewThread(string name, shared_ptr<Queue<cv::Mat*>> queue) :
  Thread("preview"),
  channelName(name),
  previewQueue(queue)
{
}

uint32_t PreviewThread::run()
{
  printf("## Starting preview thread\n");

  // Open the named pipe for reading
  uint64_t namedPipeId = 0;
  if (!platform::openNamedPipeForReading(channelName, namedPipeId))
  {
    printf("[PreviewThread] Failed to open named pipe\n");
    return 1;
  }

  uint8_t frameHeader[FRAME_HEADER_SIZE];
  uint8_t* buffer = 0;
  uint32_t bufferSize = 0;
  uint32_t number, width, height, length;
  while (!checkForExit())
  {
    // Read the frame header from the named pipe and extract the fields
    if (!readAll(namedPipeId, &(frameHeader[0]), FRAME_HEADER_SIZE))
    {
      printf("[PreviewThread] Failed to read from named pipe\n");
      return 1;
    }
    if (!frameheader::parse(frameHeader, number, width, height, length))
    {
      printf("[PreviewThread] Failed to parse frame header\n");
      return 1;
    }

    // Read the frame
    if (bufferSize < length)
    {
      if (bufferSize != 0)
      {
        delete [] buffer;
      }
      bufferSize = length;
      buffer = new uint8_t[bufferSize];
    }
    if (!readAll(namedPipeId, buffer, length))
    {
      printf("[PreviewThread] Failed to read from named pipe\n");
      return 1;
    }

    // Wrap the frame as an OpenCV matrix and add it to the preview queue
    Mat wrapped(height, width, CV_8UC4, buffer);
    Mat* copy = new Mat;
    wrapped.copyTo(*copy);
    previewQueue->addItem(copy);
  }

  platform::closeNamedPipeForReading(namedPipeId);
  printf("## Stopping preview thread\n");
  return 0;
}

bool PreviewThread::readAll(uint64_t file, uint8_t* buffer, uint32_t length)
{
  uint32_t bytesRead = 0;
  while (bytesRead < length)
  {
    int32_t ret = platform::read(file, buffer + bytesRead, length - bytesRead);
    if (ret == -1)
    {
      return false;
    }
    bytesRead += (uint32_t)ret;
  }
  return true;
}
