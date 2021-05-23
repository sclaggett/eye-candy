#pragma once

typedef struct
{
  uint8_t* frame;
  size_t length;
  uint32_t width;
  uint32_t height;
  uint32_t id;
} FrameWrapper;
