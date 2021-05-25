#include "Platform.h"
#include <Windows.h>

using namespace std;

void platform::sleep(uint32_t timeMs)
{
  Sleep(timeMs);
}

bool platform::spawnProcess(string executable, vector<string> arguments,
  uint64_t& pid, uint64_t& stdIn, uint64_t& stdOut, uint64_t& stdErr)
{
  // Set the bInheritHandle flag so pipe handles are inherited.
  SECURITY_ATTRIBUTES saAttr;
  saAttr.nLength = sizeof(SECURITY_ATTRIBUTES);
  saAttr.bInheritHandle = TRUE;
  saAttr.lpSecurityDescriptor = NULL;
  
  // Create a pipe for the child process's stdout and ensure the read handle to the pipe is not inherited.
  HANDLE childStdoutRd = NULL, childStdoutWr = NULL;
  if (!CreatePipe(&childStdoutRd, &childStdoutWr, &saAttr, 0))
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to create stdout pipes\n");
    return false;
  }
  if (!SetHandleInformation(childStdoutRd, HANDLE_FLAG_INHERIT, 0))
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to set stdout pipe flag\n");
    return false;
  }

  // Create a pipe for the child process's stderr and ensure the read handle to the pipe is not inherited.
  HANDLE childStderrRd = NULL, childStderrWr = NULL;
  if (!CreatePipe(&childStderrRd, &childStderrWr, &saAttr, 0))
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to create stderr pipes\n");
    return false;
  }
  if (!SetHandleInformation(childStderrRd, HANDLE_FLAG_INHERIT, 0))
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to set stderr pipe flag\n");
    return false;
  }
  
  // Create a pipe for the child process's stdin and ensure the write handle is not inherited. 
  HANDLE childStdinRd = NULL, childStdinWr = NULL;
  if (!CreatePipe(&childStdinRd, &childStdinWr, &saAttr, 0))
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to create stdin pipes\n");
    return false;
  }
  if (!SetHandleInformation(childStdinWr, HANDLE_FLAG_INHERIT, 0))
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to set stdin pipe flag\n");
    return false;
  }

  // Set up members of the PROCESS_INFORMATION structure. 
  PROCESS_INFORMATION piProcInfo; 
  ZeroMemory( &piProcInfo, sizeof(PROCESS_INFORMATION) );
  STARTUPINFO siStartInfo;
  ZeroMemory( &siStartInfo, sizeof(STARTUPINFO) );
  siStartInfo.cb = sizeof(STARTUPINFO); 
  siStartInfo.hStdError = childStderrWr;
  siStartInfo.hStdOutput = childStdoutWr;
  siStartInfo.hStdInput = childStdinRd;
  siStartInfo.dwFlags |= STARTF_USESTDHANDLES;
 
  // Format the executable and arguments into a single string.
  string commandLine = executable;
  for (auto it = arguments.begin(); it != arguments.end(); ++it)
  {
    commandLine += " ";
    commandLine += *it;
  }
    
  // Create the child process.
  LPSTR cmdLineStr = strdup(commandLine.c_str());
  if (!CreateProcess(NULL, cmdLineStr, NULL, NULL, TRUE, CREATE_NO_WINDOW, NULL, NULL,
    &siStartInfo, &piProcInfo))
  {
    free(cmdLineStr);
    fprintf(stderr, "[Platform_Win] ERROR: Failed to create ffmpeg process\n");
    return false;
  }
  free(cmdLineStr);
  
  // Close the handles to the child process thread and the stdin, stdout, and stderr pipes no longer
  // needed by the child process.
  CloseHandle(piProcInfo.hThread);
  CloseHandle(childStdoutWr);
  CloseHandle(childStderrWr);
  CloseHandle(childStdinRd);
  
  // Remember the handles.
  pid = (uint64_t)piProcInfo.hProcess;
  stdIn = (uint64_t)childStdinWr;
  stdOut = (uint64_t)childStdoutRd;
  stdErr = (uint64_t)childStderrRd;
  return true;
}

bool platform::isProcessRunning(uint64_t pid)
{
  DWORD exitCode = 0;
  if (!GetExitCodeProcess((HANDLE)pid, &exitCode))
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to check if child process is running\n");
    return false;
  }
  return (exitCode == STILL_ACTIVE);
}

bool platform::terminateProcess(uint64_t pid, uint32_t exitCode)
{
  return TerminateProcess((HANDLE)pid, exitCode);
}

typedef struct
{
  runFunction func;
  void* context;
} RUN_CONTEXT;
DWORD runHelperWin(void* context)
{
  RUN_CONTEXT* runContext = (RUN_CONTEXT*)context;
  uint32_t ret = runContext->func(runContext->context);
  delete runContext;
  return (DWORD)ret;
}
bool platform::spawnThread(runFunction func, void* context, uint64_t& threadId)
{
  RUN_CONTEXT* runContext = new RUN_CONTEXT;
  runContext->func = func;
  runContext->context = context;
  DWORD dwThreadId = 0;
  threadId = (uint64_t)CreateThread(NULL, 0, &runHelperWin, runContext, 0, &dwThreadId);
  return (threadId != 0);
}

bool platform::terminateThread(uint64_t threadId, uint32_t exitCode)
{
  return TerminateThread((HANDLE)threadId, 1);
}

bool platform::generateUniquePipeName(string& channelName)
{
  // Create a name for the unique pipe
  UUID pipeId = {0};
  UuidCreate(&pipeId);
  RPC_CSTR pipeIdStr = NULL;
  UuidToString(&pipeId, &pipeIdStr);
  channelName = "\\\\.\\pipe\\";
  channelName += (char*)pipeIdStr;
  RpcStringFree(&pipeIdStr);
  return true;
}

bool platform::createNamedPipeForWriting(string channelName, uint64_t& pipeId,
  bool& opening)
{
  // Create the named pipe
  HANDLE pipe = CreateNamedPipe(channelName.c_str(), PIPE_ACCESS_OUTBOUND,
    PIPE_TYPE_BYTE | PIPE_NOWAIT, 1, 0, 0, 0, NULL);
  if (pipe == INVALID_HANDLE_VALUE)
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to create named pipe for writing (%i)\n", GetLastError());
    return false;
  }
  pipeId = (uint64_t)pipe;

  // Set the opening flag because we're waiting for the remote process to connect
  opening = true;
  return true;
}

bool platform::openNamedPipeForWriting(uint64_t pipeId, bool& opened)
{
  // Wait for the client to connect
  ConnectNamedPipe((HANDLE)pipeId, NULL);
  DWORD err = GetLastError();
  if (err == ERROR_PIPE_CONNECTED)
  {
    opened = true;
    return true;
  }
  else if (err == ERROR_PIPE_LISTENING)
  {
    opened = false;
    return true;
  }
  else
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to open named pipe for writing (%i)\n", err);
    return false;
  }
}

void platform::closeNamedPipeForWriting(string channelName, uint64_t pipeId)
{
  CloseHandle((HANDLE)pipeId);
}

bool platform::openNamedPipeForReading(string channelName, uint64_t& pipeId, bool& fileNotFound)
{
  // Open the named pipe for reading
  HANDLE pipe = CreateFile(channelName.c_str(), GENERIC_READ,
    FILE_SHARE_READ | FILE_SHARE_WRITE, NULL, OPEN_EXISTING,
    FILE_ATTRIBUTE_NORMAL, NULL);
  if (pipe == INVALID_HANDLE_VALUE)
  {
    fileNotFound = (GetLastError() == ERROR_FILE_NOT_FOUND);
    if (!fileNotFound)
    {
      fprintf(stderr, "[Platform_Win] ERROR: Failed to open named pipe for reading (%i)\n", GetLastError());
    }
    return false;
  }
  pipeId = (uint64_t)pipe;

  return true;
}

void platform::closeNamedPipeForReading(uint64_t pipeId)
{
  CloseHandle((HANDLE)pipeId);
}

int32_t platform::waitForData(uint64_t file, uint32_t timeoutMs)
{
  // This isn't implemented on Windows because we let the read() function below block
  return (int32_t)file;
}

int32_t platform::read(uint64_t file, uint8_t* buffer, uint32_t maxLength, bool& closed)
{
  DWORD dwRead = 0;
  if (!ReadFile((HANDLE)file, buffer, maxLength, &dwRead, NULL))
  {
    closed = (GetLastError() == ERROR_BROKEN_PIPE);
    if (!closed)
    {
      fprintf(stderr, "[Platform_Win] ERROR: Failed to read from file or pipe (%i)\n", GetLastError());
    }
    return -1;
  }
  return (int32_t)dwRead;
}

int32_t platform::write(uint64_t file, const uint8_t* buffer, uint32_t length)
{
  DWORD dwWritten = 0;
  if (!WriteFile((HANDLE)file, buffer, length, &dwWritten, NULL))
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to write to file or pipe (%i)\n", GetLastError());
    return -1;
  }
  return dwWritten;
}

void platform::close(uint64_t file)
{
  CloseHandle((HANDLE)file);
}

uint32_t platform::getDisplayFrequency(int32_t x, int32_t y)
{
  // Get the monitor from the point
  POINT pt;
  pt.x = x;
  pt.y = y;
  HMONITOR hMonitor = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
  if (hMonitor == NULL)
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to find monitor from point (%i, %i)\n", x, y);
    return 0;
  }

  // Look up the device name of the monitor
  MONITORINFOEX monitorInfo;
  memset(&monitorInfo, 0, sizeof(MONITORINFOEX));
  monitorInfo.cbSize = sizeof(MONITORINFOEX);
  if (!GetMonitorInfoA(hMonitor, &monitorInfo))
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to get monitor info\n");
    return 0;
  }

  // Get the display frequency
  DEVMODE devMode;
  memset(&devMode, 0, sizeof(DEVMODE));
  devMode.dmSize = sizeof(DEVMODE);
  if (!EnumDisplaySettings(monitorInfo.szDevice, ENUM_CURRENT_SETTINGS, &devMode))
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to enumeate display settings\n");
    return 0;
  }
  return devMode.dmDisplayFrequency;
}

bool platform::createProjectorWindow(uint32_t x, uint32_t y)
{
  return true;
}

bool platform::displayProjectorFrame(std::shared_ptr<FrameWrapper> wrapper)
{
  uint32_t sleepMs = (uint32_t)(1000.0 / wrapper->fps);
  platform::sleep(sleepMs);
  return true;
}

void platform::destroyProjectorWindow()
{
}
