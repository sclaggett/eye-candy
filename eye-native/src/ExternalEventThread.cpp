#include "ExternalEventThread.h"
#include "Platform.h"

using namespace std;

ExternalEventThread::ExternalEventThread() :
  Thread("externalevent"),
  eventTimestamp(0)
{
}

uint64_t ExternalEventThread::getEventTimestamp()
{
  unique_lock<mutex> lock(timestampMutex);
  uint64_t timestamp = eventTimestamp;
  eventTimestamp = 0;
  return timestamp;
}

uint32_t ExternalEventThread::run()
{
  if (!platform::startExternalEventDetection())
  {
    return 1;
  }
  while (!checkForExit())
  {
    uint64_t eventTimestampUsec = 0;
    if (!platform::waitForExternalEvent(10, eventTimestampUsec))
    {
      continue;
    }
    {
      unique_lock<mutex> lock(timestampMutex);
      eventTimestamp = eventTimestampUsec;
    }
  }
  platform::stopExternalEventDetection();
  return 0;
}
