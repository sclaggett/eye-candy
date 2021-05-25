#include "PlaybackThread.h"
#include "FfmpegPlaybackProcess.h"
#include "FfprobeProcess.h"
#include "Platform.h"
#include <sstream>

using namespace std;

PlaybackThread::PlaybackThread(vector<string> vids,
    shared_ptr<Queue<shared_ptr<FrameWrapper>>> outputQueue, string ffmpeg,
    string ffprobe, wrapper::JsCallback* log, wrapper::JsCallback* duration) :
  Thread("playback"),
  videos(vids),
  outputFrameQueue(outputQueue),
  ffmpegPath(ffmpeg),
  ffprobePath(ffprobe),
  logCallback(log),
  durationCallback(duration)
{
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

  // Notify the javascript of the total duration
  wrapper::invokeJsCallback(durationCallback, totalDurationMs);
  {
    stringstream message;
    message << "Total playback duration: " << formatDuration(totalDurationMs / 1000) << endl;
    wrapper::invokeJsCallback(logCallback, message.str());
  }

  // Video playback loop
  double timestampSec = 0;
  for (uint32_t i = 0; i < videos.size(); ++i)
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
      if (outputFrameQueue->size() >= (5 * fps))
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

      // Convert the stream of data from ffmpeg into discreet frames
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
          outputFrameQueue->addItem(wrapper);
          frameNumber += 1;
          timestampSec += 1.0 / fps;
          wrapper = 0;
        }
        data = data.substr(bytesToCopy);
      }
    }

    // Stop ffmpeg
    if (ffmpegProcess->isProcessRunning())
    {
      ffmpegProcess->waitForExit();
    }
    delete ffmpegProcess;
    {
      stringstream message;
      message << "Decoding of video file " << to_string(i + 1) << " complete." << endl;
      wrapper::invokeJsCallback(logCallback, message.str());
    }
  }
  return 0;
}
