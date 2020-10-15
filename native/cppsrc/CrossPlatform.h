#pragma once

#include <list>
#include <sstream>
#include <string>

namespace os
{
  // Check if the given path exists and is executable
  bool checkExecutable(std::string path);

  // Execute a program and wait for it to exit. Captures stdout and stderr as streams
  // and return the exit code
  int executeProgram(std::string path, std::list<std::string> args, std::ostream& out,
    std::ostream& err);
}
