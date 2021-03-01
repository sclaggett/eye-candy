#pragma once

#include <string>
#include <vector>

typedef uint32_t (*runFunction)(void* context);

namespace platform
{
  void sleep(uint32_t timeMs);

  bool spawnProcess(std::string executable, std::vector<std::string> arguments,
    uint64_t& pid, uint64_t& stdIn, uint64_t& stdOut, uint64_t& stdErr);
  bool isProcessRunning(uint64_t pid);
  bool terminateProcess(uint64_t pid, uint32_t exitCode);

  bool spawnThread(runFunction func, void* context, uint64_t& threadId);
  bool terminateThread(uint64_t threadId, uint32_t exitCode);

  bool generateUniquePipeName(std::string& channelName);
  bool createNamedPipeForWriting(std::string channelName, uint64_t& pipeId, bool& opening);
  bool openNamedPipeForWriting(uint64_t pipeId, bool& opened);
  void closeNamedPipeForWriting(std::string channelName, uint64_t pipeId);
  bool openNamedPipeForReading(std::string channelName, uint64_t& pipeId);
  void closeNamedPipeForReading(uint64_t pipeId);

  int32_t waitForData(uint64_t file, uint32_t timeoutMs);
  int32_t read(uint64_t file, uint8_t* buffer, uint32_t maxLength);
  int32_t write(uint64_t file, const uint8_t* buffer, uint32_t length);
  void close(uint64_t file);
}
