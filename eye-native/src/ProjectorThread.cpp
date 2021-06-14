#include "ProjectorThread.h"
#include "Platform.h"

using namespace std;

ProjectorThread::ProjectorThread(int32_t xi, int32_t yi, bool scale,
    uint32_t refresh, shared_ptr<Queue<shared_ptr<FrameWrapper>>> inputQueue,
    shared_ptr<Queue<shared_ptr<FrameWrapper>>> outputQueue,
    wrapper::JsCallback* log, wrapper::JsCallback* position,
    wrapper::JsCallback* delay) :
  Thread("projector"),
  x(xi),
  y(yi),
  scaleToFit(scale),
  refreshRate(refresh),
  inputFrameQueue(inputQueue),
  outputFrameQueue(outputQueue),
  logCallback(log),
  positionCallback(position),
  delayCallback(delay)
{
}

uint32_t ProjectorThread::run()
{
  string error;
  if (!platform::createProjectorWindow(x, y, scaleToFit, refreshRate, error))
  {
    wrapper::invokeJsCallback(logCallback, "ERROR: Failed to create projector window: " + 
      error + "\n");
    return 1;
  }
  bool starting = true;
  while (!checkForExit())
  {
    // Grab the next frame from the queue
    shared_ptr<FrameWrapper> wrapper;
    if (!inputFrameQueue->waitItem(&wrapper, 10))
    {
      continue;
    }

    // Playback officially starts the first time we call displayProjectorFrame() below. Wait
    // until we have two seconds worth of frames to prevent starvation during startup
    if (starting)
    {
      uint32_t startThreshold = wrapper->fps * 2;
      while ((inputFrameQueue->size() < startThreshold) && !checkForExit())
      {
        platform::sleep(5);
      }
      if (checkForExit())
      {
        continue;
      }
      starting = false;
    }

    // Display the frame on the projector. This function aligns with the monitor's
    // vsync signal and is the rate-limiting step in this thread
    uint64_t timestamp = 0;
    uint32_t delayMs = 0;
    if (!platform::displayProjectorFrame(wrapper, timestamp, delayMs, error))
    {
      wrapper::invokeJsCallback(logCallback, "ERROR: Failed to display projector frame: " +
        error + "\n");
      platform::destroyProjectorWindow();
      return 1;
    }

    // TODO: Save the frame timestamp to the run file
    //fprintf(stderr, "Displayed frame %i at 0x%llx\n", wrapper->number, timestamp);

    // Notify the UI of our progress and pass the frame to the output queue
    uint32_t durationMs = (int32_t)(1000.0 / (double)wrapper->fps) + 1;
    wrapper::invokeJsCallback(positionCallback, wrapper->timestampMs + durationMs);
    if (delayMs != 0)
    {
      wrapper::invokeJsCallback(delayCallback, delayMs);
    }
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
