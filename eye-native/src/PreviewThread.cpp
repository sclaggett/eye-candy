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
  // Open the named pipe for reading. It's not unusual for this process to start
  // before the frame thread has created the named pipe so wait a few seconds.
  uint64_t namedPipeId = 0;
  uint32_t failCount = 0;
  bool fileNotFound;
  while ((namedPipeId == 0) && (failCount < 30))
  {
    if (!platform::openNamedPipeForReading(channelName, namedPipeId, fileNotFound))
    {
      if (fileNotFound)
      {
        platform::sleep(100);
        failCount += 1;
      }
      else
      {
        printf("[PreviewThread] ERROR: Failed to open named pipe (1)\n");
        return 1;
      }
    }
  }
  if (namedPipeId == 0)
  {
    printf("[PreviewThread] ERROR: Failed to open named pipe (2)\n");
    return 1;
  }

  uint8_t frameHeader[FRAME_HEADER_SIZE];
  uint8_t* buffer = 0;
  uint32_t bufferSize = 0;
  uint32_t number, width, height, length;
  bool closed;
  while (!checkForExit())
  {
    // Read the frame header from the named pipe and extract the fields
    if (!readAll(namedPipeId, &(frameHeader[0]), FRAME_HEADER_SIZE, closed))
    {
      if (closed)
      {
        break;
      }
      printf("[PreviewThread] ERROR: Failed to read header from named pipe\n");
      return 1;
    }
    if (!frameheader::parse(frameHeader, number, width, height, length))
    {
      printf("[PreviewThread] ERROR: Failed to parse frame header\n");
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
    if (!readAll(namedPipeId, buffer, length, closed))
    {
      if (closed)
      {
        break;
      }
      printf("[PreviewThread] ERROR: Failed to read frame from named pipe\n");
      return 1;
    }

    // Wrap the frame as an OpenCV matrix and add it to the preview queue
    Mat wrapped(height, width, CV_8UC4, buffer);
    Mat* copy = new Mat;
    wrapped.copyTo(*copy);
    previewQueue->addItem(copy);
  }

  platform::closeNamedPipeForReading(namedPipeId);
  return 0;
}

bool PreviewThread::readAll(uint64_t file, uint8_t* buffer, uint32_t length, bool& closed)
{
  uint32_t bytesRead = 0;
  while (bytesRead < length)
  {
    int32_t ret = platform::read(file, buffer + bytesRead, length - bytesRead, closed);
    if (ret == -1)
    {
      return false;
    }
    bytesRead += (uint32_t)ret;
  }
  return true;
}
