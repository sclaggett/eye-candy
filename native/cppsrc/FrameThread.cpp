#include "FrameThread.h"
#include <opencv2/core/core.hpp>
#include <opencv2/imgcodecs.hpp>
#include <opencv2/imgproc/imgproc.hpp>

using namespace std;
using namespace cv;

FrameThread::FrameThread(shared_ptr<FfmpegProcess> process,
    shared_ptr<Queue<FrameWrapper*>> pendingQueue,
    shared_ptr<Queue<FrameWrapper*>> completedQueue, uint32_t wid, uint32_t hgt) :
  Thread("frame"),
  ffmpegProcess(process),
  pendingFrameQueue(pendingQueue),
  completedFrameQueue(completedQueue),
  width(wid),
  height(hgt)
{
}

void* FrameThread::run()
{
  uint32_t frameNumber = 0;
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
    ffmpegProcess->writeStdin(frame.data, frame.total() * frame.elemSize());

    // Add the frame to the completed queue
    completedFrameQueue->addItem(wrapper);
    frameNumber += 1;
  }
  return 0;
}
