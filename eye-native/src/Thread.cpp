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

std::string Thread::spawn()
{
  if (threadId != 0)
  {
    return "An instance of the thread is already running";
  }
  if (!platform::spawnThread(runHelper, this, threadId))
  {
    return "Failed to spawn thread";
  }
  threadRunning = true;
  return "";
}

bool Thread::isRunning()
{
  if (threadId == 0)
  {
    return false;
  }
  return threadRunning;
}

std::string Thread::terminate()
{
  if (threadId == 0)
  {
    return "";
  }
  signalExit();
  if (waitForCompletion(100))
  {
    return "";
  }
  if (!platform::terminateThread(threadId, 1))
  {
    return "Unable to cancel thread";
  }
  threadRunning = false;
  return "";
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
