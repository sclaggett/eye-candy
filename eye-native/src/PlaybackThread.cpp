#include "PlaybackThread.h"
#include "Platform.h"

using namespace std;

PlaybackThread::PlaybackThread(vector<string> vids,
    shared_ptr<Queue<FrameWrapper*>> outputQueue, string ffmpeg) :
  Thread("playback"),
  videos(vids),
  outputFrameQueue(outputQueue),
  ffmpegPath(ffmpeg)
{
}

uint32_t PlaybackThread::run()
{
  while (!checkForExit())
  {
    platform::sleep(10);
  }

  return 0;
}
