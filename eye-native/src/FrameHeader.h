#pragma once

#include <string>

// These functions encapsulates the process of serializing and deserializing frames.
// Each frame consists of the following fields when serialized:
//
// - Magic number (uint32_t)
// - Frame number (uint32_t)
// - Width (uint32_t)
// - Height (uint32_t)
// - DataLength (uint32_t)
// - Data (variable)
//
// The functions below handle the header which is defined as all fields except the
// variable-sized frame body.

// The number of bytes in each frame header
#define FRAME_HEADER_SIZE 20

namespace frameheader
{
  std::string format(uint32_t number, uint32_t width, uint32_t height, uint32_t length);
  bool parse(uint8_t* header, uint32_t& number, uint32_t& width, uint32_t& height,
    uint32_t& length);
}
