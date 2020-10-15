#include <napi.h>

namespace ffmpegwrapper
{
  std::string initialize(Napi::Env env, std::string ffmpegPath);
  Napi::String initializedWrapped(const Napi::CallbackInfo& info);

  std::string open(Napi::Env env, std::string filePath);
  Napi::String openWrapped(const Napi::CallbackInfo& info);

  void write(Napi::Env env);
  void writeWrapped(const Napi::CallbackInfo& info);

  std::string close(Napi::Env env);
  Napi::String closeWrapped(const Napi::CallbackInfo& info);

  Napi::Object Init(Napi::Env env, Napi::Object exports);
}
