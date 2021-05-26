#include "Platform.h"
#include <afxwin.h>
#include <afxpriv.h>
#include <d3d11.h>

using namespace std;

// The ProjectorWindow class is derived from CFrameWnd and handles opening a
// fullscreen window on the projector monitor
class ProjectorWindow : public CFrameWnd
{
private:
  HMONITOR hMonitor;
  IDXGISwapChain* swapChain;
  ID3D11Device* device;
  ID3D11DeviceContext* context;
  ID3D11RenderTargetView* renderTarget;

public:
  ProjectorWindow() :
    hMonitor(nullptr),
    swapChain(nullptr),
    device(nullptr),
    context(nullptr),
    renderTarget(nullptr)
  {
  };
  virtual ~ProjectorWindow() {};

  bool createWindow(uint32_t x, uint32_t y)
  {
    // Get the monitor from the point
    POINT pt;
    pt.x = x;
    pt.y = y;
    hMonitor = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
    if (hMonitor == nullptr)
    {
      fprintf(stderr, "[Platform_Win] ERROR: Failed to find monitor from point (%i, %i)\n", x, y);
      return false;
    }

    // Get the dimensions of the projector monitor
    MONITORINFO info;
    memset(&info, 0, sizeof(MONITORINFO));
    info.cbSize = sizeof(MONITORINFO);
    if (!GetMonitorInfoA(hMonitor, &info))
    {
      fprintf(stderr, "[Platform_Win] ERROR: Failed to get monitor info\n");
      return false;
    }
    CRect projectorRect(info.rcMonitor);

    // Create an instance of this class on the projector monitor and show it
    if (!Create(nullptr, _T("EyeCandy"), WS_OVERLAPPEDWINDOW, projectorRect))
    {
      fprintf(stderr, "[Platform_Win] ERROR: Failed to create window\n");
      return false;
    }
    ShowWindow(SW_SHOW);

    // Create the swap chain
    DXGI_SWAP_CHAIN_DESC swapChainDesc;
    memset(&swapChainDesc, 0, sizeof(DXGI_SWAP_CHAIN_DESC));
    swapChainDesc.BufferCount = 2;
    swapChainDesc.BufferDesc.Width = projectorRect.Width();
    swapChainDesc.BufferDesc.Height = projectorRect.Height();
    swapChainDesc.BufferDesc.RefreshRate.Numerator = 0;
    swapChainDesc.BufferDesc.RefreshRate.Denominator = 0;
    swapChainDesc.BufferDesc.Format = DXGI_FORMAT_R8G8B8A8_UNORM;
    swapChainDesc.BufferDesc.ScanlineOrdering = DXGI_MODE_SCANLINE_ORDER_UNSPECIFIED;
    swapChainDesc.BufferDesc.Scaling = DXGI_MODE_SCALING_UNSPECIFIED;
    swapChainDesc.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT;
    swapChainDesc.SampleDesc.Count = 1;
    swapChainDesc.SampleDesc.Quality = 0;
    swapChainDesc.OutputWindow = m_hWnd;
    swapChainDesc.Windowed = TRUE;
    swapChainDesc.SwapEffect = DXGI_SWAP_EFFECT_FLIP_DISCARD;
    swapChainDesc.Flags = DXGI_SWAP_CHAIN_FLAG_ALLOW_MODE_SWITCH;
    if (FAILED(D3D11CreateDeviceAndSwapChain(nullptr, D3D_DRIVER_TYPE_HARDWARE,
      nullptr, 0, nullptr, 0, D3D11_SDK_VERSION, &swapChainDesc, &swapChain, &device,
      nullptr, &context)))
    {
      fprintf(stderr, "[Platform_Win] ERROR: Failed to create swap chain\n");
      return false;
    }

    // Detect if newly created full-screen swap chain isn't actually full screen. Note
    // that the app is fullscreen given the way that we're creating it.
    BOOL fullscreen;
    if (FAILED(swapChain->GetFullscreenState(&fullscreen, nullptr)))
    {
      fprintf(stderr, "[Platform_Win] ERROR: Failed to get fullscreen state\n");
      return false;
    }
    fprintf(stderr, "## Fullscreen: %i\n", fullscreen);
    if (!fullscreen)
    {
    fprintf(stderr, "## Switching to fullscreen\n");
      swapChain->SetFullscreenState(true, nullptr);
    }

    // Create back buffer
    ID3D11Texture2D* backBuffer = nullptr;
    if (FAILED(swapChain->GetBuffer(0, __uuidof(ID3D11Texture2D), (LPVOID*)&backBuffer)))
    {
      fprintf(stderr, "[Platform_Win] ERROR: Failed to get back buffer\n");
      return false;
    }

    // Initialize the viewport
    D3D11_VIEWPORT viewport;
    viewport.Width = (FLOAT)projectorRect.Width();
    viewport.Height = (FLOAT)projectorRect.Height();
    viewport.MinDepth = 0.0f;
    viewport.MaxDepth = 1.0f;
    viewport.TopLeftX = 0;
    viewport.TopLeftY = 0;
    context->RSSetViewports(1, &viewport);

    // Create render target
    HRESULT res = device->CreateRenderTargetView(backBuffer, nullptr, &renderTarget);
    backBuffer->Release();
    if (FAILED(res))
    {
      fprintf(stderr, "[Platform_Win] ERROR: Failed to create view\n");
      return false;
    }
    context->OMSetRenderTargets(1, &renderTarget, nullptr);
    return true;
  }

  uint32_t temp = 0;
  bool displayFrame(shared_ptr<FrameWrapper> frame)
  {
    // If you want the current mode, use unspecified values for all properties in FindClosestMatchingMode.
    //DXGIOutput::FindClosestMatchingMode;

    // Draw the frame
    if ((temp++ % 30) < 15)
    {
      float color[4] = { 1.0f, 1.0f, 1.0f, 1.0f };
      context->ClearRenderTargetView(renderTarget, color);
    }
    else
    {
      float color[4] = { 0.0f, 0.0f, 0.0f, 1.0f };
      context->ClearRenderTargetView(renderTarget, color);
    }

    // Wait for vertical blank
    IDXGIOutput* output;
    if (FAILED(swapChain->GetContainingOutput(&output)) || FAILED(output->WaitForVBlank()))
    {
      fprintf(stderr, "[Platform_Win] ERROR: Failed to wait for vsync\n");
      return false;
    }

    // Present the frame
    swapChain->Present(1, 0);
    return true;
  }

  void destroyWindow()
  {
    if (swapChain != nullptr)
    {
      BOOL fullscreen = false;
      swapChain->GetFullscreenState(&fullscreen, nullptr);
      if (fullscreen)
      {
        swapChain->SetFullscreenState(false, nullptr);
      }
      swapChain->Release();
      swapChain = nullptr;
    }
    if (renderTarget != nullptr)
    {
      renderTarget->Release();
      renderTarget = 0;
    }
    if (context != nullptr)
    {
      context->ClearState();
      context->Flush();
      context->Release();
      context = nullptr;
    }
    if (device != nullptr)
    {
      device->Release();
      device = nullptr;
    }
    DestroyWindow();
  }

  BOOL PreCreateWindow(CREATESTRUCT& cs) override
  {
    // Call the base implementation and then modify the style to make this a borderless, full-screen window
    if (!CFrameWnd::PreCreateWindow(cs))
    {
      return false;
    }
    cs.style |= WS_MAXIMIZE | WS_POPUP;
    cs.style &= ~WS_CAPTION & ~WS_BORDER & ~WS_THICKFRAME;
    return true;
  }

  afx_msg void OnSize(UINT nType, int cx, int cy)
  {
    // Resize the swap chain
    if (swapChain && FAILED(swapChain->ResizeBuffers(0, cx, cy,
      DXGI_FORMAT_R8G8B8A8_UNORM, DXGI_SWAP_CHAIN_FLAG_ALLOW_MODE_SWITCH)))
    {
      fprintf(stderr, "[Platform_Win] ERROR: Failed to resize the swap chain\n");
    }
  }

  // We handle this private AFX message because CFrameWnd's implementation uses the
  // AfxGetThread() function which returns NULL in our case and causes a segfault
  LRESULT DummyActivateTopLevel(WPARAM wParam, LPARAM lParam)
  {
    return CWnd::OnActivateTopLevel(wParam, lParam);
  }

  DECLARE_MESSAGE_MAP()
};

BEGIN_MESSAGE_MAP(ProjectorWindow, CFrameWnd)
  ON_WM_SIZE()
  ON_MESSAGE(WM_ACTIVATETOPLEVEL, &ProjectorWindow::DummyActivateTopLevel)
  ON_WM_DESTROY()
END_MESSAGE_MAP()

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
  saAttr.bInheritHandle = true;
  saAttr.lpSecurityDescriptor = nullptr;
  
  // Create a pipe for the child process's stdout and ensure the read handle to the pipe is not inherited.
  HANDLE childStdoutRd = nullptr, childStdoutWr = nullptr;
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
  HANDLE childStderrRd = nullptr, childStderrWr = nullptr;
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
  HANDLE childStdinRd = nullptr, childStdinWr = nullptr;
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
  if (!CreateProcess(nullptr, cmdLineStr, nullptr, nullptr, true, CREATE_NO_WINDOW,
    nullptr, nullptr, &siStartInfo, &piProcInfo))
  {
    free(cmdLineStr);
    fprintf(stderr, "[Platform_Win] ERROR: Failed to create ffmpeg process\n");
    return false;
  }
  free(cmdLineStr);
  
  // Close the handles to the child process thread and the stdin, stdout, and stderr
  // pipes no longer needed by the child process.
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
  threadId = (uint64_t)CreateThread(nullptr, 0, &runHelperWin, runContext, 0,
    &dwThreadId);
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
  RPC_CSTR pipeIdStr = nullptr;
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
    PIPE_TYPE_BYTE | PIPE_NOWAIT, 1, 0, 0, 0, nullptr);
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
  ConnectNamedPipe((HANDLE)pipeId, nullptr);
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
    FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL,
    nullptr);
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
  if (!ReadFile((HANDLE)file, buffer, maxLength, &dwRead, nullptr))
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
  if (!WriteFile((HANDLE)file, buffer, length, &dwWritten, nullptr))
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
  if (hMonitor == nullptr)
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

ProjectorWindow* gProjectorWindow = nullptr;
bool platform::createProjectorWindow(uint32_t x, uint32_t y)
{
  if (gProjectorWindow != nullptr)
  {
    fprintf(stderr, "[Platform_Win] ERROR: Projector window already exists, cannot create\n");
    return false;
  }
  gProjectorWindow = new ProjectorWindow();
  return gProjectorWindow->createWindow(x, y);
}

bool platform::displayProjectorFrame(shared_ptr<FrameWrapper> wrapper)
{
  return gProjectorWindow->displayFrame(wrapper);
}

void platform::destroyProjectorWindow()
{
  gProjectorWindow->destroyWindow();
  gProjectorWindow = nullptr;
}
