#include "FFmpegWrapper.h"
#include "CrossPlatform.h"
#include <stdio.h>
extern "C"
{
  #include <libavcodec/avcodec.h>
  #include <libavformat/avformat.h>
  #include <libswscale/swscale.h>
}

using namespace std;

/*** Global variables ***/

string gFfmpegPath;
bool gInitialized = false;
string gHardwareEncoder, gSoftwareEncoder;

/*** Implementation functions ***/

string ffmpegwrapper::initialize(Napi::Env env, string ffmpegPath)
{
  // 
  // Remember the location of ffmpeg
  if (!os::checkExecutable(ffmpegPath))
  {
    Napi::Error::New(env, "Failed to find ffmpeg executable")
      .ThrowAsJavaScriptException();
    return "";
  }
  gFfmpegPath = ffmpegPath;


  // Check the version of ffmpeg
  list<string> args;
  args.push_back("-hide_banner");
  args.push_back("-version");
  ostringstream out, err;
  int result = os::executeProgram(gFfmpegPath, args, out, err);

  /*
  /usr/local/bin/ffmpeg -hide_banner -encoders
ffmpeg -f image2 -c:v rawvideo -framerate 24 -video_size 1920x1080 -pixel_format yuyv422
       -i path/to/img%d.raw -b:v 2000k output.mp4

  // The name of the hardware encoder is OS-specific
#ifdef __APPLE__
  // Apple devices use the Video Toolbox for hardware acceleration
  string hwEncoder = "hevc_videotoolbox";
  string swEncoder = "libx264";
#elif _WIN32
  return "Windows implemention incomplete";
#elif __linux__
  return "Linux implemention incomplete";
#else
  return "Failed to recognize operating system";
#endif
*/

  printf("## Done\n");
  gInitialized = true;
  return "";
}

string ffmpegwrapper::open(Napi::Env env, string filePath)
{
  return "";
}

void ffmpegwrapper::write(Napi::Env env)
{
}

string ffmpegwrapper::close(Napi::Env env)
{
  return "";
}

/*** Wrapper functions ***/

Napi::String ffmpegwrapper::initializedWrapped(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  if ((info.Length() != 1) || !info[0].IsString())
  {
    Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
    return Napi::String();
  } 
  Napi::String ffmpegPath = info[0].As<Napi::String>();  
  Napi::String returnValue = Napi::String::New(env,
    ffmpegwrapper::initialize(env, ffmpegPath));
  return returnValue;
}

Napi::String ffmpegwrapper::openWrapped(const Napi::CallbackInfo& info)
{
  return Napi::String();
}

void ffmpegwrapper::writeWrapped(const Napi::CallbackInfo& info)
{
}

Napi::String ffmpegwrapper::closeWrapped(const Napi::CallbackInfo& info)
{
  return Napi::String();
}

Napi::Object ffmpegwrapper::Init(Napi::Env env, Napi::Object exports)
{
  exports.Set("initialize", Napi::Function::New(env, ffmpegwrapper::initializedWrapped));
  exports.Set("open", Napi::Function::New(env, ffmpegwrapper::openWrapped));
  exports.Set("write", Napi::Function::New(env, ffmpegwrapper::writeWrapped));
  exports.Set("close", Napi::Function::New(env, ffmpegwrapper::closeWrapped));
  return exports;
}
