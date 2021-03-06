{
  "targets": [{
    "target_name": "eyenative",
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions" ],
    "sources": [
      "src/CalibrationThread.cpp",
      "src/ExternalEventThread.cpp",
      "src/FfmpegPlaybackProcess.cpp",
      "src/FfmpegRecordProcess.cpp",
      "src/FfprobeProcess.cpp",
      "src/FrameHeader.cpp",
      "src/FrameWrapper.cpp",
      "src/main.cpp",
      "src/Native.cpp",
      "src/PipeReader.cpp",
      "src/PlaybackThread.cpp",
      "src/PreviewReceiveThread.cpp",
      "src/PreviewSendThread.cpp",
      "src/ProjectorThread.cpp",
      "src/RecordThread.cpp",
      "src/Thread.cpp",
      "src/Wrapper.cpp",
    ],
    'include_dirs': [
      "<!@(node -p \"require('node-addon-api').include\")",
    ],
    'dependencies': [
      "<!(node -p \"require('node-addon-api').gyp\")"
    ],
    'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ],
    'conditions': [
      ['OS=="linux"', {
        'include_dirs': [],
        'library_dirs': []
      }],
      ['OS=="mac"', {
        "sources": [
          "src/Platform_Mac.cpp"
        ],
        'product_dir': 'build/Release/',
        'include_dirs': [
          "opencv/mac/include/"
        ],
        'library_dirs': [
          "../opencv/mac/lib/"
        ],
        'xcode_settings': {
          "MACOSX_DEPLOYMENT_TARGET": "10.15"
        },
        "link_settings": {
          "libraries": [
            "-Wl,-rpath,@loader_path/../../../eye-native/build/Release/",
          ],
        },
        'libraries': [
          "-lopencv_core",
          "-lopencv_features2d",
          "-lopencv_flann",
          "-lopencv_imgcodecs",
          "-lopencv_imgproc"
        ],
        "copies":[
          {
            'destination': './build/Release',
            'files':[
              'opencv/mac/lib/libopencv_core.4.5.2.dylib',
              'opencv/mac/lib/libopencv_core.4.5.dylib',
              'opencv/mac/lib/libopencv_core.dylib',
              'opencv/mac/lib/libopencv_features2d.4.5.2.dylib',
              'opencv/mac/lib/libopencv_features2d.4.5.dylib',
              'opencv/mac/lib/libopencv_features2d.dylib',
              'opencv/mac/lib/libopencv_flann.4.5.2.dylib',
              'opencv/mac/lib/libopencv_flann.4.5.dylib',
              'opencv/mac/lib/libopencv_flann.dylib',
              'opencv/mac/lib/libopencv_imgcodecs.4.5.2.dylib',
              'opencv/mac/lib/libopencv_imgcodecs.4.5.dylib',
              'opencv/mac/lib/libopencv_imgcodecs.dylib',
              'opencv/mac/lib/libopencv_imgproc.4.5.2.dylib',
              'opencv/mac/lib/libopencv_imgproc.4.5.dylib',
              'opencv/mac/lib/libopencv_imgproc.dylib'
            ]
          }
        ]
      }],
      ['OS=="win"', {
        "sources": [
          "src/Platform_Win.cpp"
        ],
        'include_dirs': [
          "opencv/win/include/"
        ],
        'library_dirs': [
          "opencv/win/lib/",
          "../eye-candy-jxi/lib/"
        ],
        'msvs_settings': {
          'VCCLCompilerTool': {
            'ExceptionHandling': '1',    
            'AdditionalOptions': ['/EHsc']
          }
        },
        'libraries': [
          "nafxcw.lib",
          "opencv_world451.lib",
          "Rpcrt4.lib",
          "D3D11.lib",
          "D2d1.lib",
          "DXGI.lib",
          "Jxi2PcieApi.lib"
        ],
        "copies":[
          {
            'destination': './build/Release',
            'files':[
              'opencv/win/lib/opencv_world451.dll',
              '../eye-candy-jxi/lib/Jxi2PcieApi.dll'
            ]
          }
        ]
      }]
    ]
  }]
}
