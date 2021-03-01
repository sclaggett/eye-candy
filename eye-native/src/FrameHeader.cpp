#include "FrameHeader.h"
#include <sstream>

using namespace std;

// Magic number used for alignment
#define MAGIC_NUMBER 0xFEFD

string frameheader::format(uint32_t number, uint32_t width, uint32_t height,
  uint32_t length)
{
  stringstream header;
  uint32_t magicNumber = MAGIC_NUMBER;
  header.write((const char*)&magicNumber, sizeof(magicNumber));
  header.write((const char*)&number, sizeof(number));
  header.write((const char*)&width, sizeof(width));
  header.write((const char*)&height, sizeof(height));
  header.write((const char*)&length, sizeof(length));
  return header.str();
}

bool frameheader::parse(uint8_t* header, uint32_t& number, uint32_t& width,
  uint32_t& height, uint32_t& length)
{
  // Parse and verify the magic number
  uint32_t magicNumber;
  memcpy(&magicNumber, &(header[0]), sizeof(magicNumber));
  if (magicNumber != MAGIC_NUMBER)
  {
    return false;
  }

  // Parse the remaining fields
  memcpy(&number, &(header[4]), sizeof(number));
  memcpy(&width, &(header[8]), sizeof(width));
  memcpy(&height, &(header[12]), sizeof(height));
  memcpy(&length, &(header[16]), sizeof(length));
  return true;
}
