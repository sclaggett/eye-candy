#include "FfmpegProcess.h"
#include "Platform.h"
#include <stdexcept>

using namespace std;

FfmpegProcess::FfmpegProcess(string exec, uint32_t width, uint32_t height, uint32_t fps,
    string encoder, string outputPath) :
  Thread("ffmpeg"),
  executable(exec)
{
  // Check options using:
  //   ffmpeg -h encoder=h264_videotoolbox
  // Profile and level are both interesting. Experiment with "-b:v 2000k"

  // ffmpeg -f rawvideo -pix_fmt rgb24 -vf scale=960x720 1920x1080 -framerate 30 -i pipe:0
  // -c:v h264_videotoolbox -profile:v high -pix_fmt yuv420p -y output.mp4

  // Input options
  arguments.push_back("-f");
  arguments.push_back("rawvideo");

  arguments.push_back("-pix_fmt");
  arguments.push_back("bgra");

  arguments.push_back("-video_size");
  arguments.push_back(to_string(width) + "x" + to_string(height));

  arguments.push_back("-framerate");
  arguments.push_back(to_string(fps));

  arguments.push_back("-i");
  arguments.push_back("pipe:0");

  // Output options
  //arguments.push_back("-vf");
  //arguments.push_back("scale=" + to_string(width) + "x" + to_string(height));

  arguments.push_back("-c:v");
  arguments.push_back(encoder);

  arguments.push_back("-profile:v");
  arguments.push_back("high");

  arguments.push_back("-pix_fmt");
  arguments.push_back("yuv420p");

  arguments.push_back("-y");
  arguments.push_back(outputPath);
}

uint32_t FfmpegProcess::run()
{
  if (!startProcess())
  {
    return 0;
  }
  stdoutReader = shared_ptr<PipeReader>(new PipeReader("ffmpeg_stdout",
    processStdout));
  stdoutReader->spawn();
  stderrReader = shared_ptr<PipeReader>(new PipeReader("ffmpeg_stderr",
    processStderr));
  stderrReader->spawn();
  processMutex.lock();
  processStarted = true;
  processMutex.unlock();
  processStartEvent.notify_one();
  while (isProcessRunning())
  {
    if (!stdoutReader->isRunning() ||
      !stderrReader->isRunning())
    {
      printf("ERROR: A process thread has exited unexpectedly\n");
      break;
    }
    if (checkForExit())
    {
      terminateProcess();
      break;
    }
    platform::sleep(10);
  }
  stdoutReader->terminate();
  stderrReader->terminate();

  // TODO: Iteratively print the output in the loop above
  printf("## Ffmpeg process has exited\n");
  printf("## Stdout: %s\n", stdoutReader->getData().c_str());
  printf("## Stderr: %s\n", stderrReader->getData().c_str());
  cleanUpProcess();
  return 0;
}

bool FfmpegProcess::startProcess()
{
  return platform::spawnProcess(executable, arguments, processPid, processStdin,
    processStdout, processStderr);
}

bool FfmpegProcess::isProcessRunning()
{
  std::unique_lock<std::mutex> lock(processMutex);
  if (processPid == 0)
  {
    return false;
  }
  return platform::isProcessRunning(processPid);
}

void FfmpegProcess::waitForExit()
{
  if (processStdin != 0)
  {
    platform::close(processStdin);
    processStdin = 0;
  }
  while (isRunning())
  {
    platform::sleep(10);
  }
}

void FfmpegProcess::writeStdin(uint8_t* data, uint32_t length)
{
  if (processStdin == 0)
  {
    printf("ERROR: Stdin has been closed\n");
    return;
  }
  int bytesWritten = platform::write(processStdin, data, length);
  if ((bytesWritten < 0) || ((uint32_t)bytesWritten != length))
  {
    printf("ERROR: Failed to write to process stdin\n");
  }
}

string FfmpegProcess::readStdout()
{
  return stdoutReader->getData();
}

string FfmpegProcess::readStderr()
{
  return stderrReader->getData();
}

void FfmpegProcess::terminateProcess()
{
  platform::terminateProcess(processPid, 1);
}

void FfmpegProcess::cleanUpProcess()
{
  if (processStdin != 0)
  {
    platform::close(processStdin);
    processStdin = 0;
  }
  if (processStdout != 0)
  {
    platform::close(processStdout);
    processStdout = 0;
  }
  if (processStderr != 0)
  {
    platform::close(processStderr);
    processStderr = 0;
  }
}
