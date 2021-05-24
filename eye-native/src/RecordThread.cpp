#include "RecordThread.h"
#include "FfmpegRecordProcess.h"
#include <opencv2/core/core.hpp>
#include <opencv2/imgcodecs.hpp>
#include <opencv2/imgproc/imgproc.hpp>

using namespace std;
using namespace cv;

RecordThread::RecordThread(shared_ptr<Queue<FrameWrapper*>> inputQueue,
    shared_ptr<Queue<FrameWrapper*>> outputQueue, string ffmpeg, uint32_t wid,
    uint32_t hgt, uint32_t f, string output) :
  Thread("record"),
  inputFrameQueue(inputQueue),
  outputFrameQueue(outputQueue),
  ffmpegPath(ffmpeg),
  width(wid),
  height(hgt),
  fps(f),
  outputPath(output)
{
}

uint32_t RecordThread::run()
{
  // Spawn the ffmpeg process
  FfmpegRecordProcess* ffmpegProcess = new FfmpegRecordProcess(ffmpegPath,
    width, height, fps, outputPath);
  ffmpegProcess->spawn();

  while (!checkForExit())
  {
    FrameWrapper* wrapper = 0;
    if (!inputFrameQueue->waitItem(&wrapper, 10))
    {
      continue;
    }

    // Use the resized frame if one exists or the full frame otherwise
    uint8_t* data;
    uint32_t length;
    if (wrapper->nativeFrame != 0)
    {
      data = wrapper->nativeFrame;
      length = wrapper->nativeLength;
    }
    else
    {
      data = wrapper->frame;
      length = wrapper->length;
    }

    // Write the raw frame to the ffmpeg process and add it to the output queue
    if (!ffmpegProcess->writeStdin(data, length))
    {
      printf("[FrameThread] ERROR: Failed to write to FFmpeg\n");
      break;
    }
    outputFrameQueue->addItem(wrapper);
  }

  // Stop ffmpeg
  if (ffmpegProcess->isProcessRunning())
  {
    ffmpegProcess->waitForExit();
  }
  delete ffmpegProcess;
  return 0;
}
