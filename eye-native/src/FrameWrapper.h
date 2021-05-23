#pragma once

// This structure encapsulates a frame throughout the native code
typedef struct
{
  // Unique identifier we have given this frame object
  uint32_t id;

  // A pointer to the raw frame bytes from the Electron framework and
  // the buffer length. Data is encoded in the BGRA colorspace, is
  // owned by the framework, and should not be deleted
  uint8_t* frame;
  size_t length;

  // Dimensions of the frame above
  uint32_t width;
  uint32_t height;

  // The Eletron framework appears to sometimes capture the window at 2x
  // resolution. The variables below contain the image sized down to
  // the correct dimensions, is owned by the native code, and should be
  // deleted when finised
  uint8_t* nativeFrame;
  size_t nativeLength;
  uint32_t nativeWidth;
  uint32_t nativeHeight;
} FrameWrapper;
