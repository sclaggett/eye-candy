#pragma once

#include <memory>
#include <mutex>
#include <string>
#include "Thread.h"

class PipeReader : public Thread
{
public:
  PipeReader(std::string name, uint32_t file);
  virtual ~PipeReader() {};

public:
  std::string getData();
  uint32_t run();

private:
  uint32_t file = 0;
  std::string data;
  std::mutex dataMutex;
};

