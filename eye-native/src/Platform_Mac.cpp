#include "Platform.h"
#include <crt_externs.h>
#include <errno.h>
#include <fcntl.h>
#include <pthread.h>
#include <signal.h>
#include <sys/wait.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

using namespace std;

#define PIPE_READ 0
#define PIPE_WRITE 1

void platform::sleep(uint32_t timeMs)
{
  usleep(timeMs * 1000);
}

bool platform::spawnProcess(string executable, vector<string> arguments,
  uint64_t& pid, uint64_t& stdIn, uint64_t& stdOut, uint64_t& stdErr)
{
  vector<string> environment;
  char** env = *_NSGetEnviron();
  for (int i = 0; *(env + i) != 0; i++)
  {
    environment.push_back(*(env + i));
  }
  int stdinPipe[2], stdoutPipe[2], stderrPipe[2];
  if ((pipe(stdinPipe) < 0) || (pipe(stdoutPipe) < 0) || (pipe(stderrPipe) < 0))
  {
    printf("ERROR: Failed to allocate pipes\n");
    return false;
  }
  int forkResult = fork();
  if (forkResult == 0)
  {
    if (dup2(stdinPipe[PIPE_READ], STDIN_FILENO) == -1)
    {
      exit(errno);
    }
    if (dup2(stdoutPipe[PIPE_WRITE], STDOUT_FILENO) == -1)
    {
      exit(errno);
    }
    if (dup2(stderrPipe[PIPE_WRITE], STDERR_FILENO) == -1)
    {
      exit(errno);
    }
    close(stdinPipe[PIPE_READ]);
    close(stdinPipe[PIPE_WRITE]); 
    close(stdoutPipe[PIPE_READ]);
    close(stdoutPipe[PIPE_WRITE]); 
    close(stderrPipe[PIPE_READ]);
    close(stderrPipe[PIPE_WRITE]);
    vector<char*> args, env;
    args.push_back(&executable[0]);
    for (vector<string>::iterator it = arguments.begin(); it != arguments.end();
      ++it)
    {
      args.push_back(&(*it)[0]);
    }
    args.push_back(NULL);
    for (vector<string>::iterator envIterator = environment.begin();
      envIterator != environment.end(); ++envIterator)
    {
      env.push_back(const_cast<char*>((*envIterator).c_str()));
     }
    env.push_back(NULL);
    execve(executable.c_str(), args.data(), env.data());
    exit(-1);
  }
  else if (forkResult > 0)
  {
    pid = (uint64_t)forkResult;
    stdIn = (uint64_t)stdinPipe[PIPE_WRITE];
    stdOut = (uint64_t)stdoutPipe[PIPE_READ];
    stdErr = (uint64_t)stderrPipe[PIPE_READ];
    close(stdinPipe[PIPE_READ]); 
    close(stdoutPipe[PIPE_WRITE]); 
    close(stderrPipe[PIPE_WRITE]);
    return true;
  }
  else
  {
    close(stdinPipe[PIPE_READ]);
    close(stdinPipe[PIPE_WRITE]);
    close(stdoutPipe[PIPE_READ]);
    close(stdoutPipe[PIPE_WRITE]);
    close(stderrPipe[PIPE_READ]);
    close(stderrPipe[PIPE_WRITE]);
    printf("ERROR: Failed to fork child\n");
    return false;
  }
}

bool platform::isProcessRunning(uint64_t pid)
{
  int status;
  int res = waitpid((int)pid, &status, WNOHANG);
  if (res == 0)
  {
    return true;
  }
  else if (res == (int)pid)
  {
    return false;
  }
  else if ((res == -1) && (errno == ECHILD))
  {
    return false;
  }
  else
  {
    printf("ERROR: Failed to check if child process is running\n");
    return false;
  }
}

bool platform::terminateProcess(uint64_t pid, uint32_t exitCode)
{
  return (kill((int)pid, SIGKILL) == 0);
}

typedef struct
{
  runFunction func;
  void* context;
} RUN_CONTEXT;
void* runHelperMac(void* context)
{
  RUN_CONTEXT* runContext = (RUN_CONTEXT*)context;
  uint32_t ret = runContext->func(runContext->context);
  delete runContext;
  return reinterpret_cast<void*>(ret);
}
bool platform::spawnThread(runFunction func, void* context, uint64_t& threadId)
{
  RUN_CONTEXT* runContext = new RUN_CONTEXT;
  runContext->func = func;
  runContext->context = context;
  int retVal = pthread_create((pthread_t*)&threadId, nullptr, &runHelperMac,
    runContext);
  return (retVal == 0);
}

bool platform::terminateThread(uint64_t threadId, uint32_t exitCode)
{
  return (pthread_cancel((pthread_t)threadId) == 0);
}

bool platform::generateUniquePipeName(string& channelName)
{
  // Create a temporary file
  char nameBuffer[128];
  snprintf(nameBuffer, 128, "/tmp/eyeNativeXXXXXX");
  int tmpFd = mkstemp(nameBuffer);
  if (tmpFd == -1)
  {
    return false;
  }

  // Append ".fifo" to the temporary file's name to make it unique and create a
  // named pipe
  channelName = string(nameBuffer) + ".fifo";
  return (mkfifo(channelName.c_str(), S_IRUSR | S_IWUSR | S_IWGRP | S_IXGRP | 
    S_IROTH | S_IWOTH) == 0);
}

bool platform::createNamedPipeForWriting(string channelName, uint64_t& pipeId,
  bool& opening)
{
  // Attempt to create the named pipe in nonblocking mode. This will only succeed
  // if the remote process has already opened the pipe for reading. We use this
  // approach so we don't block forever waiting on the remote process
  int pipe = open(channelName.c_str(), O_WRONLY | O_NONBLOCK);
  if (pipe == -1)
  {
    // A response of ENXIO is expected and means the other end of the pipe hasn't
    // been opened for reading, any other error code means something else went wrong
    if (errno == ENXIO)
    {
      pipeId = 0;
      return true;
    }
    else
    {
      return false;
    }
  }

  // Switch the named pipe to blocking mode now that the other end is connected
  int flags = fcntl(pipe, F_GETFL, 0);
  flags &= ~O_NONBLOCK;
  fcntl(pipe, F_SETFL, flags);

  // Skip the opening state and go straight to open
  pipeId = (uint64_t)pipe;
  opening = false;
  return true;
}

bool platform::openNamedPipeForWriting(uint64_t pipeId, bool& opened)
{
  // This shouldn't be called on Mac
  return false;
}

void platform::closeNamedPipeForWriting(string channelName, uint64_t pipeId)
{
  ::close((int)pipeId);
  unlink(channelName.c_str());
}

bool platform::openNamedPipeForReading(string channelName, uint64_t& pipeId)
{
  int ret = open(channelName.c_str(), O_RDONLY);
  if (ret == -1)
  {
    return false;
  }
  pipeId = (uint64_t)ret;
  return true;
}

void platform::closeNamedPipeForReading(uint64_t pipeId)
{
  ::close((int)pipeId);
}

int32_t platform::waitForData(uint64_t file, uint32_t timeoutMs)
{
  fd_set set;
  FD_ZERO(&set);
  FD_SET(file, &set);
  struct timeval timeout;
  timeout.tv_sec = 0;
  timeout.tv_usec = timeoutMs * 1000;
  return select(file + 1, &set, NULL, NULL, &timeout);
}

int32_t platform::read(uint64_t file, uint8_t* buffer, uint32_t maxLength)
{
  return ::read((int)file, buffer, maxLength);
}

int32_t platform::write(uint64_t file, const uint8_t* buffer, uint32_t length)
{
  return ::write((int)file, buffer, length);
}

void platform::close(uint64_t file)
{
  ::close((int)file);
}
