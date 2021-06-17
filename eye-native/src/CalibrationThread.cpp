#include "CalibrationThread.h"
#include "Platform.h"

using namespace std;

CalibrationThread::CalibrationThread(uint32_t x1, uint32_t y1,
    wrapper::JsCallback* error, wrapper::JsCallback* noSignal,
    wrapper::JsCallback* avgLatency) :
  Thread("playback"),
  x(x1),
  y(y1),
  errorCallback(error),
  noSignalCallback(noSignal),
  avgLatencyCallback(avgLatency)
{
}

uint32_t CalibrationThread::run()
{
  // Initialize the timing card and create the projector window
  if (!platform::initializeTimingCard())
  {
    wrapper::invokeJsCallback(errorCallback, "ERROR: Failed to initialize timing card.\n");
    return 1;
  }
  string error;
  if (!platform::createProjectorWindow(x, y, false, 0, error))
  {
    wrapper::invokeJsCallback(errorCallback, "ERROR: Failed to create projector window: " + 
      error + "\n");
    return 1;
  }

  // Calibration loop
  int count = 0;
  while (!checkForExit())
  {
    // Determine if the next frame and black or white and detect the first white frame we
    // display after a period of darkness
    bool whiteFrame = (count >= 6);
    bool firstWhiteFrame = (count == 6);

    // Display the frame. This function will wait until a vsync signal occurs
    uint64_t timestamp = 0;
    string error;
    if (!platform::displayCalibrationFrame(whiteFrame, timestamp, error))
    {
      wrapper::invokeJsCallback(errorCallback, "ERROR: Failed to display projector frame: " +
        error + "\n");
      platform::destroyProjectorWindow();
      break;
    }

    // Remember the timestamp if this is the first white frame and increment the count
    if (firstWhiteFrame)
    {
      // Record timestamp
    }
    count += 1;
    if (count == 12)
    {
      count = 0;
    }
  }

  platform::destroyProjectorWindow();
  platform::releaseTimingCard();
  return 0;
}

bool CalibrationThread::terminate(uint32_t timeout /*= 100*/)
{
  // It can take longer than 100 ms for the calibration thread to shut down so
  // wait for up to a full second
  return Thread::terminate(1000);
}
