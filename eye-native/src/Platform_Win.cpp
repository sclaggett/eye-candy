#include "Platform.h"
#include <afxwin.h>
#include <afxpriv.h>
#include <comdef.h>
#include <d3d11.h>
#include <d2d1_3.h>
#include <algorithm>
#include <wrl.h>
#include <sstream>

// Pull the JXI headers in from the private submodule
#include "../../eye-candy-jxi/include/Jxi2PcieApi.h"
#include "../../eye-candy-jxi/include/regdef.h"

using namespace std;
using namespace Microsoft::WRL;

#define TARGET_FORMAT DXGI_FORMAT_R8G8B8A8_UNORM

// The ProjectorWindow class is derived from CFrameWnd and handles opening a
// fullscreen window on the projector monitor
class ProjectorWindow : public CFrameWnd
{
private:
  // Scaling flag, target refresh rate, monitor handle, and video dimensions
  bool scaleToFit = false;
  uint32_t refreshRate = 0;
  HMONITOR hMonitor = NULL;
  uint32_t width = 0;
  uint32_t height = 0;

  // DirectX drawing objects
  ComPtr<ID3D11Device> d3dDevice;
  ComPtr<ID3D11DeviceContext> d3dContext;
  ComPtr<IDXGISwapChain> dxgiSwapChain;
  ComPtr<ID2D1Factory> d2dFactory;
  ComPtr<ID2D1RenderTarget> d2dRenderTarget;

  // The playback position in milliseconds that we should be at if we haven't experienced
  // any frame starvation, i.e. if there are no delays between calls to displayFrame()
  double targetPlaybackPositionMs;

  // The time when the first frame was presented in microseconds. This will be combined with
  // the current time to detect if frame starvation has occurred by comparing to the target
  // playback position
  uint64_t firstFrameTimestampUsec;

public:
  ProjectorWindow() {};
  virtual ~ProjectorWindow() {};

  bool createWindow(uint32_t x, uint32_t y, bool scale, uint32_t refresh, string& error)
  {
    // Remember the scaling mode and refresh rate
    scaleToFit = scale;
    refreshRate = refresh;

    // Get the monitor from the point
    POINT pt;
    pt.x = x;
    pt.y = y;
    hMonitor = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
    if (hMonitor == nullptr)
    {
      stringstream errStr;
      errStr << "Failed to find monitor from point (" << x << ", " << y << ")\n";
      error = errStr.str();
      return false;
    }

    // Get the dimensions of the projector monitor
    MONITORINFO info;
    memset(&info, 0, sizeof(MONITORINFO));
    info.cbSize = sizeof(MONITORINFO);
    if (!GetMonitorInfoA(hMonitor, &info))
    {
      error = "Failed to get monitor info";
      return false;
    }
    width = info.rcMonitor.right - info.rcMonitor.left;
    height = info.rcMonitor.bottom - info.rcMonitor.top;

    // Create an instance of this class on the projector monitor and show it
    if (!Create(nullptr, _T("EyeCandy"), WS_OVERLAPPEDWINDOW, CRect(info.rcMonitor)))
    {
      error = "Failed to create window";
      return false;
    }
    ShowWindow(SW_SHOW);

    // Create the swap chain
    DXGI_SWAP_CHAIN_DESC swapChainDesc;
    memset(&swapChainDesc, 0, sizeof(DXGI_SWAP_CHAIN_DESC));
    swapChainDesc.BufferCount = 2;
    swapChainDesc.BufferDesc.Width = width;
    swapChainDesc.BufferDesc.Height = height;
    swapChainDesc.BufferDesc.RefreshRate.Numerator = refreshRate;
    swapChainDesc.BufferDesc.RefreshRate.Denominator = 1;
    swapChainDesc.BufferDesc.Format = TARGET_FORMAT;
    swapChainDesc.BufferDesc.ScanlineOrdering = DXGI_MODE_SCANLINE_ORDER_UNSPECIFIED;
    swapChainDesc.BufferDesc.Scaling = DXGI_MODE_SCALING_UNSPECIFIED;
    swapChainDesc.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT;
    swapChainDesc.SampleDesc.Count = 1;
    swapChainDesc.SampleDesc.Quality = 0;
    swapChainDesc.OutputWindow = m_hWnd;
    swapChainDesc.Windowed = true;
    swapChainDesc.SwapEffect = DXGI_SWAP_EFFECT_FLIP_DISCARD;
    swapChainDesc.Flags = DXGI_SWAP_CHAIN_FLAG_ALLOW_MODE_SWITCH;
    if (FAILED(D3D11CreateDeviceAndSwapChain(nullptr, D3D_DRIVER_TYPE_HARDWARE,
      nullptr, D3D11_CREATE_DEVICE_BGRA_SUPPORT, nullptr, 0, D3D11_SDK_VERSION, &swapChainDesc,
      &dxgiSwapChain, &d3dDevice, nullptr, &d3dContext)))
    {
      error = "Failed to create swap chain";
      return false;
    }

    // Create the Direct2D factory and the DirectX resources
    if (FAILED(D2D1CreateFactory<ID2D1Factory>(D2D1_FACTORY_TYPE_SINGLE_THREADED, &d2dFactory)))
    {
      error = "Failed to create 2D factory";
      return false;
    }
    if (!CreateResources())
    {
      error = "Failed to create resources";
      return false;
    }

    // Detect if newly created full-screen swap chain isn't actually full screen and make it so
    BOOL fullscreen;
    if (FAILED(dxgiSwapChain->GetFullscreenState(&fullscreen, nullptr)))
    {
      error = "Failed to get fullscreen state";
      return false;
    }
    if (!fullscreen)
    {
      dxgiSwapChain->SetFullscreenState(true, nullptr);
    }

    // Reset the playback variables
    targetPlaybackPositionMs = 0;
    firstFrameTimestampUsec = 0;
    return true;
  }

  bool CreateResources()
  {
    // Get swap chain surface
    ComPtr<IDXGISurface> dxgiSurface;
    if (FAILED(dxgiSwapChain->GetBuffer(0, __uuidof(IDXGISurface), static_cast<void**>(&dxgiSurface))))
    {
      fprintf(stderr, "[Platform_Win] ERROR: Failed to get surface of swap chain\n");
      return false;
    }

    // Create render target
    D2D1_RENDER_TARGET_PROPERTIES rtDesc = D2D1::RenderTargetProperties(D2D1_RENDER_TARGET_TYPE_HARDWARE,
      D2D1::PixelFormat(DXGI_FORMAT_UNKNOWN, D2D1_ALPHA_MODE_PREMULTIPLIED));
    if (FAILED(d2dFactory->CreateDxgiSurfaceRenderTarget(dxgiSurface.Get(), &rtDesc, &d2dRenderTarget)))
    {
      fprintf(stderr, "[Platform_Win] ERROR: Failed to create D2D render target\n");
      return false;
    }
    return true;
  }

  void DeleteResources()
  {
    // Release all outstanding references to the swap chain's buffers
    d3dContext->OMSetRenderTargets(0, 0, 0);
    d2dRenderTarget = nullptr;
  }

  bool displayVideoFrame(shared_ptr<FrameWrapper> frame, uint64_t& timestamp, int32_t& delayMs, string& error)
  {
    // Hack: Check the current refresh rate and blow up if it doesn't match our target. We shouldn't
    // have to do this--we should switch the projector to the correct refresh rate, preferrably during
    // swap chain creation or on resize. But I'm having difficulty getting that to work so I'm working
    // around it in order to get the rest of the system up and running. Properly setting the refresh
    // rate is being left as an exercise to you, dear reader. Or you can be a lazy hack too and just
    // force the target refresh rate in advanced display settings.
    ComPtr<IDXGIOutput> output;
    if (FAILED(dxgiSwapChain->GetContainingOutput(&output)))
    {
      error = "Failed to get containing output";
      return false;
    }
    DXGI_MODE_DESC emptyMode = {};
    DXGI_MODE_DESC currentMode;
    memset(&currentMode, 0, sizeof(DXGI_MODE_DESC));
    if (FAILED(output->FindClosestMatchingMode(&emptyMode, &currentMode, d3dDevice.Get())))
    {
      error = "Failed to get current frame rate";
      return false;
    }
    uint32_t framesPerSecond = currentMode.RefreshRate.Numerator / currentMode.RefreshRate.Denominator;
    if (((currentMode.RefreshRate.Numerator % currentMode.RefreshRate.Denominator) != 0) ||
      (framesPerSecond != refreshRate))
    {
      stringstream errStr;
      errStr << "Actual refresh rate (" << framesPerSecond << ") does not match target rate (" << 
        refreshRate << "). Try setting refresh rate in advanced video settings.";
      error = errStr.str();
      return false;
    }

    /* Step 1: Draw the frame to the back buffer */

    // Start with a solid black background
    d2dRenderTarget->BeginDraw();
    d2dRenderTarget->Clear(D2D1::ColorF(0, 0, 0, 1));

    // Create a bitmap from the raw frame pixels
    D2D1_BITMAP_PROPERTIES bitmapProperties;
    memset(&bitmapProperties, 0, sizeof(D2D1_BITMAP_PROPERTIES));
    bitmapProperties.pixelFormat.format = DXGI_FORMAT_B8G8R8A8_UNORM;
    bitmapProperties.pixelFormat.alphaMode = D2D1_ALPHA_MODE_IGNORE;
    ComPtr<ID2D1Bitmap> bitmap;
    if (FAILED(d2dRenderTarget->CreateBitmap(
      D2D1::SizeU(frame->nativeWidth, frame->nativeHeight),
      frame->nativeFrame, frame->nativeWidth * 4, &bitmapProperties, &bitmap)))
    {
      error = "Failed to create bitmap";
      return false;
    }

    // Draw the bitmap to the context
    D2D1_RECT_F destRectangle;
    if (scaleToFit)
    {
      destRectangle = D2D1::RectF(0, 0, width, height);
    }
    else
    {
      destRectangle.left = (width - frame->nativeWidth) / 2;
      destRectangle.right = destRectangle.left + frame->nativeWidth;
      destRectangle.top = (height - frame->nativeHeight) / 2;
      destRectangle.bottom = destRectangle.top + frame->nativeHeight;
    }
    D2D1_RECT_F srcRectangle = D2D1::RectF(0, 0, frame->nativeWidth, frame->nativeHeight);
    d2dRenderTarget->DrawBitmap(bitmap.Get(), &destRectangle, 1.0,
      D2D1_BITMAP_INTERPOLATION_MODE_LINEAR, &srcRectangle);
    if (FAILED(d2dRenderTarget->EndDraw()))
    {
      error = "Failed to draw to context";
      return false;
    }

    /* Step 2: Present the frame */
    
    // Present the frame when the next vsync occurs and make a note of the timestamp
    HRESULT hr = dxgiSwapChain->Present(1, 0);
    if (FAILED(hr))
    {
      _com_error errCom(hr);
      stringstream errStr;
      errStr << "Failed to present frame: " << hex << hr << ", " <<
        errCom.ErrorMessage();
      error = errStr.str();
      return false;
    }
    timestamp = platform::readTimestampUsec();

    /* Step 3: Calculate any culmulative delay in the video playback */

    // Measure the actual playback position and use it to calculate any delay caused by
    // frame starvation
    if (firstFrameTimestampUsec == 0)
    {
      firstFrameTimestampUsec = timestamp;
    }
    double actualPlaybackPositionMs = (double)(timestamp - firstFrameTimestampUsec) / 1000;
    delayMs = (int32_t)(actualPlaybackPositionMs - targetPlaybackPositionMs);

    // Update the target playback position, a value that won't actually be valid until the next
    // vertical sync
    if (frame->fps != 0)
    {
      targetPlaybackPositionMs += 1000 / (double)frame->fps;
    }

    /* Step 4: Wait for additional vsync signals */

    // Calculate the number of vsync signals this frame should be displayed for
    uint32_t syncInterval = 1;
    if (frame->fps != 0)
    {
      syncInterval = refreshRate / frame->fps;
    }

    // Wait for additional vsync signals if this frame needs to be displayed for
    // more than a single refresh
    for (uint32_t i = 1; i < syncInterval; ++i)
    {
      if (FAILED(output->WaitForVBlank()))
      {
        error = "Failed to wait for vsync";
        return false;
      }
    }
    return true;
  }

  bool displayCalibrationFrame(bool whiteFrame, uint64_t& timestamp, string& error)
  {    
    /* Step 1: Paint the background of the back buffer */

    // Start with a solid black background
    d2dRenderTarget->BeginDraw();
    if (whiteFrame)
    {
      d2dRenderTarget->Clear(D2D1::ColorF(1, 1, 1, 1));
    }
    else
    {
      d2dRenderTarget->Clear(D2D1::ColorF(0, 0, 0, 1));
    }
    if (FAILED(d2dRenderTarget->EndDraw()))
    {
      error = "Failed to draw to context";
      return false;
    }

    /* Step 2: Present the frame */

    // Wait until the next vsync and present the frame
    HRESULT hr = dxgiSwapChain->Present(1, 0);
    if (FAILED(hr))
    {
      _com_error errCom(hr);
      stringstream errStr;
      errStr << "Failed to present frame: " << hex << hr << ", " <<
        errCom.ErrorMessage();
      error = errStr.str();
      return false;
    }

    // Make a note of the timestamp
    timestamp = platform::readTimestampUsec();
    return true;
  }

  void destroyWindow()
  {
    if (dxgiSwapChain != nullptr)
    {
      BOOL fullscreen = false;
      dxgiSwapChain->GetFullscreenState(&fullscreen, nullptr);
      if (fullscreen)
      {
        dxgiSwapChain->SetFullscreenState(false, nullptr);
      }
      dxgiSwapChain = nullptr;
    }
    d3dDevice = nullptr;
    if (d3dContext != nullptr)
    {
      d3dContext->ClearState();
      d3dContext->Flush();
      d3dContext = nullptr;
    }
    d2dFactory = nullptr;
    d2dRenderTarget = nullptr;
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
    width = cx;
    height = cy;

    if (dxgiSwapChain != nullptr)
    {
      // Release all outstanding DirectX resources, resize the swap chain, and recreate
      // the DirectX resources
      DeleteResources();
      if (FAILED(dxgiSwapChain->ResizeBuffers(0, 0, 0, TARGET_FORMAT, 0)))
      {
        fprintf(stderr, "[Platform_Win] ERROR: Failed to resize the swap chain\n");
        return;
      }
      if (!CreateResources())
      {
        fprintf(stderr, "[Platform_Win] ERROR: Failed to create resources\n");
        return;
      }
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

vector<uint32_t> platform::getDisplayFrequencies(int32_t x, int32_t y)
{
  vector<uint32_t> displayFrequencies;

  // Get the monitor from the point
  POINT pt;
  pt.x = x;
  pt.y = y;
  HMONITOR hMonitor = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
  if (hMonitor == nullptr)
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to find monitor from point (%i, %i)\n", x, y);
    return displayFrequencies;
  }

  // Get the monitor dimensions so we can limit the modes we consider below
  MONITORINFO monitorInfo;
  memset(&monitorInfo, 0, sizeof(MONITORINFO));
  monitorInfo.cbSize = sizeof(MONITORINFO);
  if (!GetMonitorInfo(hMonitor, &monitorInfo))
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to get monitor info\n");
    return displayFrequencies;
  }
  uint32_t monitorWidth = monitorInfo.rcMonitor.right - monitorInfo.rcMonitor.left;
  uint32_t monitorHeight = monitorInfo.rcMonitor.bottom - monitorInfo.rcMonitor.top;

  // Create a factory and use it to enumerate over the adapters in the system
  IDXGIFactory* factory = nullptr;
  if (FAILED(CreateDXGIFactory(__uuidof(IDXGIFactory), (void**)&factory)))
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to create DirectX factory\n");
    return displayFrequencies;
  }
  bool found = false;
  uint32_t adapterIndex = 0;
  while (!found)
  {
    IDXGIAdapter* adapter = nullptr;
    if (FAILED(factory->EnumAdapters(adapterIndex++, &adapter)))
    {
      break;
    }

    // Enumerate over the outputs associated with this adapter
    uint32_t outputIndex = 0;
    while (!found)
    {
      IDXGIOutput* output = nullptr;
      if (FAILED(adapter->EnumOutputs(outputIndex++, &output)))
      {
        break;
      }

      // Check the description of the output and see if it's associated with the
      // monitor handle that we're looking for
      DXGI_OUTPUT_DESC outputDesc;
      memset(&outputDesc, 0, sizeof(DXGI_OUTPUT_DESC));
      if (FAILED(output->GetDesc(&outputDesc)))
      {
        fprintf(stderr, "[Platform_Win] ERROR: Failed to get output description\n");
        return displayFrequencies;
      }
      if (outputDesc.Monitor == hMonitor)
      {
        // We found the output that corresponds to the desired monitor. Get a list of
        // display modes that match the current resolution and run at an integer number
        // of frames per second
        found = true;
        UINT numModes = 0;
        if (FAILED(output->GetDisplayModeList(TARGET_FORMAT, 0, &numModes, 0)))
        {
          fprintf(stderr, "[Platform_Win] ERROR: Failed to get display mode count\n");
          return displayFrequencies;
        }
        DXGI_MODE_DESC* modeDescs = new DXGI_MODE_DESC[numModes];
        if (FAILED(output->GetDisplayModeList(TARGET_FORMAT, 0, &numModes, modeDescs)))
        {
          fprintf(stderr, "[Platform_Win] ERROR: Failed to get display mode list\n");
          return displayFrequencies;
        }
        for (uint32_t i = 0; i < numModes; ++i)
        {
          if ((modeDescs[i].Width != monitorWidth) ||
            (modeDescs[i].Height != monitorHeight))
          {
            continue;
          }
          if (modeDescs[i].RefreshRate.Numerator % modeDescs[i].RefreshRate.Denominator)
          {
            continue;
          }
          uint32_t fps = modeDescs[i].RefreshRate.Numerator /
            modeDescs[i].RefreshRate.Denominator;
          if (find(displayFrequencies.begin(), displayFrequencies.end(), fps) !=
            displayFrequencies.end())
          {
            continue;
          }
          displayFrequencies.push_back(fps);
        }
        delete [] modeDescs;
      }
      output->Release();
    }
    adapter->Release();
  }
  factory->Release();
  sort(displayFrequencies.begin(), displayFrequencies.end());
  return displayFrequencies;
}

ProjectorWindow* gProjectorWindow = nullptr;
bool platform::createProjectorWindow(uint32_t x, uint32_t y, bool scaleToFit,
  uint32_t refreshRate, string& error)
{
  if (gProjectorWindow != nullptr)
  {
    error = "Projector window already exists, cannot create";
    return false;
  }
  gProjectorWindow = new ProjectorWindow();
  return gProjectorWindow->createWindow(x, y, scaleToFit, refreshRate, error);
}

bool platform::displayVideoFrame(shared_ptr<FrameWrapper> wrapper, uint64_t& timestamp,
  int32_t& delayMs, string& error)
{
  return gProjectorWindow->displayVideoFrame(wrapper, timestamp, delayMs, error);
}

bool platform::displayCalibrationFrame(bool whiteFrame, uint64_t& timestamp, string& error)
{
  return gProjectorWindow->displayCalibrationFrame(whiteFrame, timestamp, error);
}

void platform::destroyProjectorWindow()
{
  gProjectorWindow->destroyWindow();
  gProjectorWindow = nullptr;
}

HANDLE gJxiHandle = 0;
BYTE* gJxiBase = nullptr;
PJXI2_NOTIFICATION_HANDLE gNotificationHandle = 0;
bool platform::initializeTimingCard()
{
  JXI2_STATUS status = Jxi2OpenSyncclock(&gJxiHandle, (void**)&gJxiBase);
  if (status != JXI2_STATUS_OK)
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to initialize timing card, status = %i\n",
      status);
    return false;
  }
  return true;
}

// In these two functions lay the secrets to getting the correct value from the
// JXI timing card
unsigned char ParseBCD(unsigned char bcd)
{
  unsigned char retVal = 0;
  for (int i = 0; i < 2; ++i)
  {
    retVal += (bcd & 0xF) * (unsigned char)pow(10, i);
    bcd = bcd >> 4;
  }
  return retVal;
}
unsigned long ParseBCD(unsigned long bcd)
{
  unsigned long retVal = 0;
  for (int i = 0; i < 8; ++i)
  {
    retVal += (bcd & 0xF) * (unsigned long)pow(10, i);
    bcd = bcd >> 4;
  }
  return retVal;
}

uint64_t platform::readTimestampUsec()
{
  if (gJxiBase == nullptr)
  {
    fprintf(stderr, "[Platform_Win] ERROR: Timing card has not been initialized\n");
    return 0;
  }
  unsigned int time_usec = ParseBCD(*(volatile unsigned long*)(gJxiBase + Sec10_Usec1_Port));
  unsigned int time_min = ParseBCD(*(volatile unsigned long*)(gJxiBase + Year1_Min1_Port));
  return ((uint64_t)time_min * 60 * 1000 * 1000) + time_usec;
}

bool platform::startExternalEventDetection()
{
  if (gJxiBase == nullptr)
  {
    fprintf(stderr, "[Platform_Win] ERROR: Timing card has not been initialized\n");
    return false;
  }
  if (gNotificationHandle != 0)
  {
    fprintf(stderr, "[Platform_Win] ERROR: External event detection is already running\n");
    return false;
  }

  // Disable all interrupts
  *(volatile unsigned char*)(gJxiBase + Control_Port) = 0;

  // Register for notifications from JXI's library
  JXI2_STATUS status = Jxi2RegisterForNotification(gJxiHandle, &gNotificationHandle);
  if (status != JXI2_STATUS_OK)
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to register for notifications, status = %d\n",
      status);
    return false;
  }

  // Start listening
  *(volatile unsigned char*)(gJxiBase + Control_Port) = Ext_Intr_Enb;
  return true;
}

void platform::clearExternalEvent()
{
  if (gJxiBase == nullptr)
  {
    fprintf(stderr, "[Platform_Win] ERROR: Timing card has not been initialized\n");
    return;
  }

  // Clear the external event tag if set
  unsigned char extstatus = *(volatile unsigned char*)(gJxiBase + Status_Port);
  if ((extstatus & Ext_Ready) != 0)
  {
    unsigned int exttime_usec = *(volatile unsigned long*)(gJxiBase + Ext_Sec10_Usec1_Port);
    unsigned int exttime_min = *(volatile unsigned long*)(gJxiBase + Ext_Year1_Min1_Port);
    unsigned char exttime_100ns = *(volatile unsigned char*)(gJxiBase + Ext_100ns_Port);
  }
}

bool platform::waitForExternalEvent(uint32_t timeoutMs, uint64_t& eventTimestampUs)
{
  if (gJxiBase == nullptr)
  {
    fprintf(stderr, "[Platform_Win] ERROR: Timing card has not been initialized\n");
    return false;
  }
  if (gNotificationHandle == 0)
  {
    fprintf(stderr, "[Platform_Win] ERROR: External event detection is not running\n");
    return false;
  }

  // Wait up to timeoutMs for an external event to occur
  JXI2_STATUS status = Jxi2WaitForNotification(gJxiHandle, gNotificationHandle, timeoutMs, true);
  if (status == JXI2_STATUS_TIMEOUT)
  {
    return false;;
  }
  if (status != JXI2_STATUS_OK)
  {
    fprintf(stderr, "[Platform_Win] ERROR: Failed to wait for notification, status = %d\n",
      status);
    return false;
  }

  // Remember the timestamp in microseconds
  unsigned char extstatus = *(volatile unsigned char*)(gJxiBase + Status_Port);
  if ((extstatus & Ext_Ready) == 0)
  {
    return false;
  }
  unsigned int exttime_usec = ParseBCD(*(volatile unsigned long*)(gJxiBase + Ext_Sec10_Usec1_Port));
  unsigned int exttime_min = ParseBCD(*(volatile unsigned long*)(gJxiBase + Ext_Year1_Min1_Port));
  eventTimestampUs = ((uint64_t)exttime_min * 60 * 1000 * 1000) + exttime_usec;
  return true;
}

void platform::stopExternalEventDetection()
{
  if ((gJxiBase == nullptr) || (gNotificationHandle == 0))
  {
    return;
  }

  // Disable all interrupts
  *(gJxiBase + Control_Port) = 0;

  // Not strictly necessary, as any outstanding notifications will be 
  // cleaned up when closing the device
  Jxi2UnregisterNotification(gJxiHandle, gNotificationHandle);
  gNotificationHandle = 0;
}

void platform::releaseTimingCard()
{
  if (gJxiHandle != 0)
  {
    Jxi2CloseSyncclock(gJxiHandle);
    gJxiHandle = 0;
    gJxiBase = nullptr;
  }
}
