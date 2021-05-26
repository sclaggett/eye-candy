#include "Thread.h"
#include "Platform.h"

using namespace std;

// Helper function that bridged from C to C++
uint32_t runHelper(void* context)
{
  return ((Thread*)context)->runStart();
}

Thread::Thread(string name) :
  threadName(name)
{
}

bool Thread::spawn()
{
  if (threadId != 0)
  {
    return false;
  }
  if (!platform::spawnThread(runHelper, this, threadId))
  {
    return false;
  }
  threadRunning = true;
  return true;
}

bool Thread::isRunning()
{
  if (threadId == 0)
  {
    return false;
  }
  return threadRunning;
}

bool Thread::terminate(uint32_t timeout /*= 100*/)
{
  if (threadId == 0)
  {
    return true;
  }
  signalExit();
  if (waitForCompletion(timeout))
  {
    return false;
  }
  if (!platform::terminateThread(threadId, 1))
  {
    return false;
  }
  threadRunning = false;
  return true;
}

void Thread::signalExit()
{
  unique_lock<mutex> lock(threadMutex);
  threadExit = true;
}

bool Thread::checkForExit()
{
  unique_lock<mutex> lock(threadMutex);
  return threadExit;
}

void Thread::signalComplete()
{
  threadRunning = false;
  completeEvent.notify_one();
}

bool Thread::waitForCompletion(uint32_t timeout)
{
  unique_lock<mutex> lock(threadMutex);
  if (threadRunning)
  {
    completeEvent.wait_for(lock, chrono::milliseconds(timeout));
  }
  return !threadRunning;
}

uint32_t Thread::runStart()
{
  uint32_t retVal = run();
  signalComplete();
  return retVal;
}
