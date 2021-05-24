#include "PipeReader.h"
#include "Platform.h"

using namespace std;

PipeReader::PipeReader(string name, uint32_t f) :
  Thread(name),
  file(f)
{
}

string PipeReader::getData()
{
  unique_lock<mutex> lock(dataMutex);
  string ret = data;
  data.clear();
  return ret;
}

uint32_t PipeReader::run()
{
  char buffer[1024];
  bool closed;
  while (!checkForExit())
  {
    // Wait for data to become available to read and continue around the loop if nothing
    // arrives within 100 ms
    int32_t ret = platform::waitForData(file, 10);
    if (ret == -1)
    {
      printf("[PipeReader] ERROR: Failed to wait for data\n");
      break;
    }
    else if (ret == 0)
    {
      continue;
    }

    // Read data from the pipe and append it to the data string
    ret = platform::read(file, (uint8_t*)&(buffer[0]), 1024, closed);
    if (ret == -1)
    {
      if (!closed)
      {
        printf("[PipeReader] ERROR: Failed to read from pipe\n");
      }
      break;
    }
    else if (ret > 0)
    {
      unique_lock<mutex> lock(dataMutex);
      data.append(buffer, ret);
    }
  }
  return 0;
}
