#include "FrameWrapper.h"

FrameWrapper::FrameWrapper(uint32_t num) :
  number(num),
  timestampMs(0),
  fps(0),
  electronFrame(0),
  electronLength(0),
  electronWidth(0),
  electronHeight(0),
  nativeFrame(0),
  nativeLength(0),
  nativeWidth(0),
  nativeHeight(0)
{
}

FrameWrapper::~FrameWrapper()
{
  if (nativeFrame != 0)
  {
    delete [] nativeFrame;
    nativeFrame = 0;
  }
}
