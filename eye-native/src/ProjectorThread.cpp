#include "ProjectorThread.h"
#include "Platform.h"

using namespace std;

ProjectorThread::ProjectorThread(int32_t xi, int32_t yi, bool scale,
    shared_ptr<Queue<shared_ptr<FrameWrapper>>> inputQueue,
    shared_ptr<Queue<shared_ptr<FrameWrapper>>> outputQueue,
    wrapper::JsCallback* log, wrapper::JsCallback* position) :
  Thread("projector"),
  x(xi),
  y(yi),
  scaleToFit(scale),
  inputFrameQueue(inputQueue),
  outputFrameQueue(outputQueue),
  logCallback(log),
  positionCallback(position)
{
}

uint32_t ProjectorThread::run()
{
  if (!platform::createProjectorWindow(x, y))
  {
    wrapper::invokeJsCallback(logCallback, "ERROR: Failed to create projector window.\n");
    return 1;
  }
  while (!checkForExit())
  {
    // Grab the next frame from the queue
    shared_ptr<FrameWrapper> wrapper;
    if (!inputFrameQueue->waitItem(&wrapper, 10))
    {
      continue;
    }

    // Display the frame on the projector. This function aligns with the monitor's
    // vsync signal and is the rate-limiting step in this thread
    if (!platform::displayProjectorFrame(wrapper))
    {
      wrapper::invokeJsCallback(logCallback, "ERROR: Failed to display projector frame.\n");
      platform::destroyProjectorWindow();
      return 1;
    }

    // Notify the UI of our progress and pass the frame to the output queue
    uint32_t durationMs = (int32_t)(1000.0 / (double)wrapper->fps) + 1;
    wrapper::invokeJsCallback(positionCallback, wrapper->timestampMs + durationMs);
    outputFrameQueue->addItem(wrapper);
  }
  platform::destroyProjectorWindow();
  return 0;
}

bool ProjectorThread::terminate(uint32_t timeout /*= 100*/)
{
  // It can take longer than 100 ms for the projector thread to shut down so
  // wait for up to a full second
  return Thread::terminate(1000);
}