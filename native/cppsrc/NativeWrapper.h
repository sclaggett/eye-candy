#include <napi.h>
#include <vector>

namespace nativewrapper
{
  void initialize(Napi::Env env, std::string ffmpegPath);
  void initializedWrapped(const Napi::CallbackInfo& info);

	std::string open(Napi::Env env, int width, int height, int fps, std::string encoder,
    std::string outputPath);
  Napi::String openWrapped(const Napi::CallbackInfo& info);

  int32_t write(Napi::Env env, uint8_t* frame, size_t length, int width, int height);
  Napi::Number writeWrapped(const Napi::CallbackInfo& info);

  std::vector<int32_t> checkCompleted(Napi::Env env);
  Napi::Int32Array checkCompletedWrapped(const Napi::CallbackInfo& info);

  void close(Napi::Env env);
  void closeWrapped(const Napi::CallbackInfo& info);

  Napi::Object Init(Napi::Env env, Napi::Object exports);
}
