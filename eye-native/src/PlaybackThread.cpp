#include "PlaybackThread.h"
#include "FfmpegPlaybackProcess.h"
#include "FfprobeProcess.h"
#include "Platform.h"
#include <sstream>

using namespace std;

PlaybackThread::PlaybackThread(vector<string> vids,
    shared_ptr<Queue<FrameWrapper*>> outputQueue, string ffmpeg,
    string ffprobe, wrapper::JsCallback* log) :
  Thread("playback"),
  videos(vids),
  outputFrameQueue(outputQueue),
  ffmpegPath(ffmpeg),
  ffprobePath(ffprobe),
  logCallback(log)
{
}

uint32_t PlaybackThread::run()
{
  // Check the dimensions, frame rate, and length of each video file
  wrapper::invokeJsCallback(logCallback, "Examining video files...\n");
  vector<pair<uint32_t, uint32_t>> videoDimensions;
  vector<uint32_t> videoFps;
  vector<uint32_t> videoLengths;
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
    stringstream message;
    message << to_string(i + 1) << ". " << video << ": " <<
      to_string(width) << " x " << to_string(height) <<
      " @ " << to_string(fps) << " fps, " <<
      to_string(frameCount) << " frames" << endl;
    wrapper::invokeJsCallback(logCallback, message.str());

    // Abort if we've been signaled to exit
    if (checkForExit())
    {
      return 1;
    }
  }

  // Video playback loop
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
      message << "Starting playback of video file " << to_string(i + 1) << "." << endl;
      wrapper::invokeJsCallback(logCallback, message.str());
    }
    FfmpegPlaybackProcess* ffmpegProcess = new FfmpegPlaybackProcess(ffmpegPath, video);
    ffmpegProcess->spawn();

    // Read each frame of the video
    uint32_t frameSize = width * height * 4, frameNumber = 0;
    FrameWrapper* wrapper = 0;
    while (!checkForExit() && (frameNumber < frameCount))
    {
      string data = ffmpegProcess->readStdout();
      if (data.empty())
      {
        platform::sleep(5);
        continue;
      }
      while (!data.empty())
      {
        if (wrapper == 0)
        {
          wrapper = new FrameWrapper();
          memset(wrapper, 0, sizeof(FrameWrapper));
          wrapper->nativeFrame = new uint8_t[frameSize];
          wrapper->nativeWidth = width;
          wrapper->nativeHeight = height;
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
      message << "Video file " << to_string(i + 1) << " playback complete." << endl;
      wrapper::invokeJsCallback(logCallback, message.str());
    }
  }
  return 0;
}
