#pragma once

#include <memory>
#include <mutex>
#include <string>
#include "Thread.h"

class PipeReader : public Thread
{
public:
  PipeReader(std::string name, int fd);
  virtual ~PipeReader() {};

public:
  std::string getData();
  void* run();

private:
  int fd = 0;
  std::string data;
  std::mutex dataMutex;
};

