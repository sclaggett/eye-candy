#include "ProjectorThread.h"
#include "Platform.h"

using namespace std;

ProjectorThread::ProjectorThread(int32_t xi, int32_t yi, bool scale,
    shared_ptr<Queue<shared_ptr<FrameWrapper>>> inputQueue,
    shared_ptr<Queue<shared_ptr<FrameWrapper>>> outputQueue,
    wrapper::JsCallback* position) :
  Thread("projector"),
  x(xi),
  y(yi),
  scaleToFit(scale),
  inputFrameQueue(inputQueue),
  outputFrameQueue(outputQueue),
  positionCallback(position)
{
}

uint32_t ProjectorThread::run()
{
  while (!checkForExit())
  {
    shared_ptr<FrameWrapper> wrapper;
    if (!inputFrameQueue->waitItem(&wrapper, 10))
    {
      continue;
    }

    platform::sleep(30);

    // Notify the javascript of our progress
    uint32_t durationMs = (int32_t)(1000.0 / (double)wrapper->fps) + 1;
    wrapper::invokeJsCallback(positionCallback, wrapper->timestampMs + durationMs);

    outputFrameQueue->addItem(wrapper);
  }
  return 0;
}
