#include "PipeReader.h"
#include <unistd.h>

using namespace std;

PipeReader::PipeReader(string name, int f) :
  Thread(name),
  fd(f)
{
}

string PipeReader::getData()
{
  unique_lock<mutex> lock(dataMutex);
  string ret = data;
  data.clear();
  return ret;
}

void* PipeReader::run()
{
  char buffer[1024];
  while (!checkForExit())
  {
    fd_set set;
    FD_ZERO(&set);
    FD_SET(fd, &set);
    struct timeval timeout;
    timeout.tv_sec = 0;
    timeout.tv_usec = 100000;
    int rv = select(fd + 1, &set, NULL, NULL, &timeout);
    if (rv == -1)
    {
      printf("ERROR: Failed to wait for pipe\n");
      return 0;
    }
    if (rv == 0)
    {
      continue;
    }
    ssize_t readCount = read(fd, buffer, 1023);
    if (readCount == -1)
    {
      printf("ERROR: Failed to read from pipe\n");
      return 0;
    }
    if (readCount == 0)
    {
      break;
    }
    if (readCount > 0)
    {
      buffer[readCount] = 0;
      unique_lock<mutex> lock(dataMutex);
      data += buffer;
    }
  }
  return 0;
}
