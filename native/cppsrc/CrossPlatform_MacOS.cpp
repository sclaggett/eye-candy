#ifdef __APPLE__

#include "CrossPlatform.h"
#include <stdio.h>

using namespace std;

// Check if the given path exists and is executable
bool os::checkExecutable(string path)
{
  printf("## Check executable\n");
  return true;
}

  // Execute a program and wait for it to exit. Captures stdout and stderr as streams
  // and return the exit code
int os::executeProgram(string path, list<string> args, ostream& out, ostream& err)
{
  printf("## Execute program\n");
  return 0;
}

#endif  // __APPLE__
