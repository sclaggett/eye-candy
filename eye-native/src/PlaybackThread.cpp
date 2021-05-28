#include "PlaybackThread.h"
#include "FfmpegPlaybackProcess.h"
#include "FfprobeProcess.h"
#include "Platform.h"
#include "PreviewSendThread.h"
#include "ProjectorThread.h"
#include <sstream>

using namespace std;

PlaybackThread::PlaybackThread(uint32_t x1, uint32_t y1, vector<string> vids,
    bool scale, string ffmpeg, string ffprobe, wrapper::JsCallback* log,
    wrapper::JsCallback* duration, wrapper::JsCallback* position) :
  Thread("playback"),
  x(x1),
  y(y1),
  videos(vids),
  scaleToFit(scale),
  ffmpegPath(ffmpeg),
  ffprobePath(ffprobe),
  logCallback(log),
  durationCallback(duration),
  positionCallback(position)
{
}

void PlaybackThread::setPreviewChannel(string name)
{
  unique_lock<mutex> lock(channelMutex);
  channelName = name;
}

string PlaybackThread::formatDuration(uint32_t durationSec)
{
  uint32_t seconds = durationSec % 60;
  uint32_t durationMin = (durationSec - seconds) / 60;
  uint32_t minutes = durationMin % 60;
  uint32_t hours = (durationMin - minutes) / 60;
  stringstream result;
  result << to_string(hours) << ":";
  if (minutes < 10)
  {
    result << "0";
  }
  result << to_string(minutes) << ":";
  if (seconds < 10)
  {
    result << "0";
  }
  result << to_string(seconds);
  return result.str();
}

uint32_t PlaybackThread::run()
{
  // Check the dimensions, frame rate, and length of each video file
  wrapper::invokeJsCallback(logCallback, "Examining video files...\n");
  vector<pair<uint32_t, uint32_t>> videoDimensions;
  vector<uint32_t> videoFps;
  vector<uint32_t> videoLengths;
  uint32_t totalFrameCount = 0;
  double totalDurationMs = 0;
  for (uint32_t i = 0; i < videos.size(); ++i)
  {
    // Spawn the ffprobe process and wait for it to complete
    string video = videos.at(i);
    FfprobeProcess* ffprobeProcess = new FfprobeProcess(ffprobePath, video);
    ffprobeProcess->spawn();
    ffprobeProcess->waitForExit();

    // Remember the video details and clean up the process
    uint32_t width = ffprobeProcess->getWidth();
    uint32_t height = ffprobeProcess->getHeight();
    uint32_t fps = ffprobeProcess->getFps();
    uint32_t frameCount = ffprobeProcess->getFrameCount();
    delete ffprobeProcess;

    // Append the video details to our vectors and log them
    videoDimensions.push_back(make_pair(width, height));
    videoFps.push_back(fps);
    videoLengths.push_back(frameCount);
    double durationMs = (double)frameCount / (double)fps * 1000;
    totalDurationMs += durationMs;
    stringstream message;
    message << to_string(i + 1) << ". " << video << ": " << to_string(width) <<
      " x " << to_string(height) << " @ " << to_string(fps) << " fps, " <<
      to_string(frameCount) << " frames, " << formatDuration(durationMs / 1000) << endl;
    wrapper::invokeJsCallback(logCallback, message.str());

    // Abort if we've been signaled to exit
    if (checkForExit())
    {
      return 1;
    }
  }

  // Examine the monitor's supported refresh rates and the frame rate of each video to
  // determine the refresh rate we should use
  vector<uint32_t> displayFrequencies = platform::getDisplayFrequencies(x, y);
  for (uint32_t i = 0; i < videos.size(); ++i)
  {
    uint32_t fps = videoFps.at(i);
    auto it = displayFrequencies.begin();
    while (it != displayFrequencies.end())
    {
      uint32_t displayFreq = *it;
      uint32_t n;
      for (n = 1; n < 5; ++n)
      {
        if (((displayFreq % n) == 0) && ((displayFreq / n) == fps))
        {
          break;
        }
      }
      if (n == 5)
      {
        it = displayFrequencies.erase(it);
      }
      else
      {
        ++it;
      }
    }
  }
  if (displayFrequencies.empty())
  {
    wrapper::invokeJsCallback(logCallback, 
      "ERROR: Invalidate combination of monitor refresh rates and video frame rates.\n");
    wrapper::invokeJsCallback(durationCallback, 0);
    wrapper::invokeJsCallback(positionCallback, 0);
    return 1;
  }
  uint32_t monitorRefreshRate = displayFrequencies.at(0);

  // Notify the javascript of the total duration
  wrapper::invokeJsCallback(durationCallback, totalDurationMs);
  {
    stringstream message;
    message << "Total playback duration: " << formatDuration(totalDurationMs / 1000) << endl;
    wrapper::invokeJsCallback(logCallback, message.str());
  }

  // Spawn the projector thread that will take the frames in the pending frames
  // queue, display they in sync with the monitor's vertical refresh, and move
  // them on to the preview frames queue
  shared_ptr<Queue<shared_ptr<FrameWrapper>>> pendingFrameQueue(
    new Queue<shared_ptr<FrameWrapper>>());
  shared_ptr<Queue<shared_ptr<FrameWrapper>>> previewFrameQueue(
    new Queue<shared_ptr<FrameWrapper>>());
  ProjectorThread* projectorThread = new ProjectorThread(x, y, scaleToFit, monitorRefreshRate,
    pendingFrameQueue, previewFrameQueue, logCallback, positionCallback);
  projectorThread->spawn();

  // Spawn the preview send thread that will transmit the frames from the preview
  // frames queue to the renderer process. Pass null in for the output queue so
  // the preview send thread will discard each frame when finished
  PreviewSendThread* previewSendThread = new PreviewSendThread(previewFrameQueue, nullptr);
  previewSendThread->spawn();

  // Video playback loop
  double timestampSec = 0;
  for (uint32_t i = 0; (i < videos.size()) && !checkForExit(); ++i)
  {
    // Get video details
    string video = videos.at(i);
    uint32_t width = videoDimensions.at(i).first;
    uint32_t height = videoDimensions.at(i).second;
    uint32_t fps = videoFps.at(i);
    uint32_t frameCount = videoLengths.at(i);

    // Spawn the ffmpeg process
    {
      stringstream message;
      message << "Starting to decode video file " << to_string(i + 1) << "." << endl;
      wrapper::invokeJsCallback(logCallback, message.str());
    }
    FfmpegPlaybackProcess* ffmpegProcess = new FfmpegPlaybackProcess(ffmpegPath, video);
    ffmpegProcess->spawn();

    // Read each frame of the video
    uint32_t frameSize = width * height * 4, frameNumber = 0;
    shared_ptr<FrameWrapper> wrapper = 0;
    while (!checkForExit() && (frameNumber < frameCount))
    {
      // Pause here and sleep if the output queue is full, i.e. contains a full 5 seconds
      // worth of frames. This is necessary because we read frames from ffmpeg much faster
      // than we project them and don't want to run out of memory
      if (pendingFrameQueue->size() >= (5 * fps))
      {
        platform::sleep(5);
        continue;
      }

      // Read ffmpeg stdout and sleep if nothing is available
      string data = ffmpegProcess->readStdout();
      if (data.empty())
      {
        platform::sleep(5);
        continue;
      }

      // Convert the stream of data from ffmpeg into discreet frames and pass them
      // to the pending frames queue
      while (!data.empty())
      {
        if (wrapper == 0)
        {
          wrapper = shared_ptr<FrameWrapper>(new FrameWrapper(frameNumber));
          wrapper->nativeFrame = new uint8_t[frameSize];
          wrapper->nativeWidth = width;
          wrapper->nativeHeight = height;
          wrapper->timestampMs = (uint64_t)(timestampSec * 1000);
          wrapper->fps = fps;
        }
        uint32_t bytesToCopy;
        if ((frameSize - wrapper->nativeLength) > data.size())
        {
          bytesToCopy = data.size();
        }
        else
        {
          bytesToCopy = frameSize - wrapper->nativeLength;
        }
        memcpy(wrapper->nativeFrame + wrapper->nativeLength, data.data(), bytesToCopy);
        wrapper->nativeLength += bytesToCopy;
        if (wrapper->nativeLength == frameSize)
        {
          pendingFrameQueue->addItem(wrapper);
          frameNumber += 1;
          timestampSec += 1.0 / fps;
          wrapper = 0;
        }
        data = data.substr(bytesToCopy);
      }

      // Pass the preview channel name to the send thread
      {
        unique_lock<mutex> lock(channelMutex);
        if (!channelName.empty())
        {
          previewSendThread->setPreviewChannel(channelName);
          channelName.clear();
        }
      }
    }

    // Stop ffmpeg
    if (ffmpegProcess->isProcessRunning())
    {
      if (!checkForExit())
      {
        ffmpegProcess->waitForExit();
      }
      else
      {
        ffmpegProcess->terminateProcess();
      }
    }
    delete ffmpegProcess;
    if (!checkForExit())
    {
      stringstream message;
      message << "Decoding of video file " << to_string(i + 1) << " complete." << endl;
      wrapper::invokeJsCallback(logCallback, message.str());
    }
  }

  // Wait until the pending and preview frame queues have drained
  while (!checkForExit() && 
    (!pendingFrameQueue->empty() || !previewFrameQueue->empty()))
  {
    platform::sleep(5);
  }

  // Shut down the projector and preview send threads
  if (projectorThread->isRunning())
  {
    projectorThread->terminate();
  }
  delete projectorThread;
  if (previewSendThread->isRunning())
  {
    previewSendThread->terminate();
  }
  delete previewSendThread;
  pendingFrameQueue = nullptr;
  previewFrameQueue = nullptr;
  return 0;
}

bool PlaybackThread::terminate(uint32_t timeout /*= 100*/)
{
  // It can take longer than 100 ms for the projector thread to shut down so
  // wait for up to a full second
  return Thread::terminate(1000);
}
