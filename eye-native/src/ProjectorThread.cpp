#include "ProjectorThread.h"
#include "Platform.h"

using namespace std;

ProjectorThread::ProjectorThread(int32_t xi, int32_t yi, uint32_t f,
    bool scale, shared_ptr<Queue<FrameWrapper*>> inputQueue,
    shared_ptr<Queue<FrameWrapper*>> outputQueue) :
  Thread("projector"),
  x(xi),
  y(yi),
  fps(f),
  scaleToFit(scale),
  inputFrameQueue(inputQueue),
  outputFrameQueue(outputQueue)
{
}

uint32_t ProjectorThread::run()
{
  while (!checkForExit())
  {
    FrameWrapper* wrapper = 0;
    if (!inputFrameQueue->waitItem(&wrapper, 10))
    {
      continue;
    }
    outputFrameQueue->addItem(wrapper);
  }
  return 0;
}
