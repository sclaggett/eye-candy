#pragma once

#include <cstdint>

class FrameWrapper
{
public:
  FrameWrapper(uint32_t number);
  virtual ~FrameWrapper();

  // Frame number, timestamp in milliseconds, and the target playback rate
  uint32_t number;
  uint64_t timestampMs;
  uint32_t fps;

  // A pointer to the raw frame bytes from the Electron framework, the
  // buffer length, and the frame dimensions. Data is encoded in the BGRA
  // colorspace. This memory is owned by the framework and should not be
  // deleted.
  uint8_t* electronFrame;
  size_t electronLength;
  uint32_t electronWidth;
  uint32_t electronHeight;

  // A pointer to the raw frame bytes that were allocated by the native
  // code and which should be released when finished. This is used during
  // recording to size the 2x frame capture by Eletron down to the target
  // size and during playback to hold the frame decoded by ffmpeg
  uint8_t* nativeFrame;
  size_t nativeLength;
  uint32_t nativeWidth;
  uint32_t nativeHeight;
};
