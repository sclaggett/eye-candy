#include "PlaybackThread.h"
#include "FfprobeProcess.h"
#include "Platform.h"

using namespace std;

PlaybackThread::PlaybackThread(vector<string> vids,
    shared_ptr<Queue<FrameWrapper*>> outputQueue, string ffmpeg, string ffprobe) :
  Thread("playback"),
  videos(vids),
  outputFrameQueue(outputQueue),
  ffmpegPath(ffmpeg),
  ffprobePath(ffprobe)
{
}

uint32_t PlaybackThread::run()
{
  // Check the dimensions, frame rate, and length of each video file
  vector<pair<uint32_t, uint32_t>> videoDimensions;
  vector<uint32_t> videoFps;
  vector<uint32_t> videoLengths;
  for (auto video = videos.begin(); video != videos.end(); ++video)
  {
    // Spawn the ffprobe process and wait for it to complete
    FfprobeProcess* ffprobeProcess = new FfprobeProcess(ffprobePath, *video);
    ffprobeProcess->spawn();
    ffprobeProcess->waitForExit();

    // Remember the video details and clean up the process
    videoDimensions.push_back(make_pair(ffprobeProcess->getWidth(),
      ffprobeProcess->getHeight()));
    videoFps.push_back(ffprobeProcess->getFps());
    videoLengths.push_back(ffprobeProcess->getFrameCount());
    delete ffprobeProcess;

    // Abort if we've been signaled to exit
    if (checkForExit())
    {
      return 1;
    }
  }

  for (uint32_t i = 0; i < videos.size(); ++i)
  {
    fprintf(stderr, "## Video %s:\n", videos.at(i).c_str());
    fprintf(stderr, "##   Size: %i x %i\n", videoDimensions.at(i).first,
      videoDimensions.at(i).second);
    fprintf(stderr, "##   Fps: %i\n", videoFps.at(i));
    fprintf(stderr, "##   Length: %i\n", videoLengths.at(i));
  }

  while (!checkForExit())
  {
    platform::sleep(10);
  }
  return 0;
}
