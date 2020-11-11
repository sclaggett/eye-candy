#include "Thread.h"
#include <unistd.h>
#include <sys/syscall.h>

using namespace std;

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
  int retVal = pthread_create(&threadId, nullptr, &Thread::runHelper, this);
  if (retVal)
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
  int retVal = pthread_cancel(threadId);
  if (retVal != 0)
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

void* Thread::runStart()
{
  void* retVal = run();
  signalComplete();
  return retVal;
}

void* Thread::runHelper(void* context)
{
  return ((Thread*)context)->runStart();
}
