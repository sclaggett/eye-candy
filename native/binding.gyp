{
  "targets": [{
    "target_name": "native",
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions" ],
    "sources": [
      "cppsrc/FrameThread.cpp",
      "cppsrc/FfmpegProcess.cpp",
      "cppsrc/main.cpp",
      "cppsrc/NativeWrapper.cpp",
      "cppsrc/PipeReader.cpp",
      "cppsrc/Thread.cpp",
    ],
    'include_dirs': [
      "<!@(node -p \"require('node-addon-api').include\")",
      "/usr/local/opt/opencv@3/include",
    ],
    'library_dirs': [
      "/usr/local/opt/opencv@3/lib",
    ],
    'libraries': [
      "-lopencv_core",
      "-lopencv_imgproc",
      "-lopencv_highgui",
      "-lopencv_features2d",
    ],
    'dependencies': [
      "<!(node -p \"require('node-addon-api').gyp\")"
    ],
    'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ]
  }]
}
