#include "CalibrationThread.h"
#include "ExternalEventThread.h"
#include "Platform.h"
#include <cmath>

#define MIN_LATENCY_COUNT 5
#define MAX_LATENCY_COUNT 10

using namespace std;

CalibrationThread::CalibrationThread(uint32_t x1, uint32_t y1, wrapper::JsCallback* error,
    wrapper::JsCallback* noSignal, wrapper::JsCallback* avgLatency) :
  Thread("calibration"),
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

  // Spawn the external event thread
  shared_ptr<ExternalEventThread> externalEventThread = shared_ptr<ExternalEventThread>(
    new ExternalEventThread());
  externalEventThread->spawn();

  // Calibration loop
  int count = 0;
  uint64_t whiteFrameTimestamp = 0;
  while (!checkForExit())
  {
    // Make sure the external event thread is still running and check if it has detected anything
    if (!externalEventThread->isRunning())
    {
      wrapper::invokeJsCallback(errorCallback, "ERROR: External event thread died\n");
      break;
    }
    uint64_t eventTimestamp = externalEventThread->getEventTimestamp();
    if ((eventTimestamp != 0) && (whiteFrameTimestamp != 0) && (eventTimestamp > whiteFrameTimestamp))
    {
      addLatencyMeasurement(eventTimestamp - whiteFrameTimestamp);
      whiteFrameTimestamp = 0;
    }

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

    // Check if this is the first white frame after a period of darkness. If so, check if a
    // signal was detected in the last cycle, clear the external event, remember the timestamp,
    // and notify the UI if no signal was detected
    if (firstWhiteFrame)
    {
      bool signalDetected = (whiteFrameTimestamp == 0);
      platform::clearExternalEvent();
      whiteFrameTimestamp = timestamp;
      if (!signalDetected)
      {
        wrapper::invokeJsCallback(noSignalCallback);
        latencies.clear();
      }
    }

    // Increment the count and roll over at 12
    count += 1;
    if (count == 12)
    {
      count = 0;
    }
  }

  if (externalEventThread->isRunning())
  {
    externalEventThread->terminate();
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

void CalibrationThread::addLatencyMeasurement(uint64_t latencyUsec)
{
  // Add this latency to our list and throw away old values if we've exceeded the maximum number
  // of measurements we want to consider
  latencies.push_back((float)latencyUsec / 1000);
  while (latencies.size() >= MAX_LATENCY_COUNT)
  {
    latencies.pop_front();
  }

  // Bail without doing anything if we haven't reached the minimum number of measurements
  if (latencies.size() < MIN_LATENCY_COUNT)
  {
    return;
  }

  // Calculate the average and standard deviation of the measurements
  float sum = 0;
  for (auto it = latencies.begin(); it != latencies.end(); ++it)
  {
    sum += *it;
  }
  float mean = sum / latencies.size();
  float variance = 0;
  for (auto it = latencies.begin(); it != latencies.end(); ++it)
  {
    variance += pow(*it - mean, 2);
  }
  float stdDev = sqrt(variance / latencies.size());
  char message[1024];
  if (stdDev > 1)
  {
    sprintf(message, "%i +/- %i ms\n", (int32_t)mean, (int32_t)stdDev);
  }
  else if (stdDev > 0.1)
  {
    sprintf(message, "%0.1f +/- %0.1f ms\n", mean, stdDev);
  }
  else
  {
    sprintf(message, "%0.2f +/- %0.2f ms\n", mean, stdDev);
  }
  wrapper::invokeJsCallback(avgLatencyCallback, message);
}
