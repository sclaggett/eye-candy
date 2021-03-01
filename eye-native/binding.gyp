{
  "targets": [{
    "target_name": "eyenative",
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions" ],
    "sources": [
      "src/FfmpegProcess.cpp",
      "src/FrameThread.cpp",
      "src/FrameHeader.cpp",
      "src/main.cpp",
      "src/Native.cpp",
      "src/PipeReader.cpp",
      "src/PreviewThread.cpp",
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
            "-Wl,-rpath,/Users/shane/Desktop/eye-candy/app/node_modules/eye-native/build/Release/"
          ],
        },
        'libraries': [
          "-Wl,-rpath,./build/Release/",
          "-lopencv_core",
          "-lopencv_features2d",
          "-lopencv_highgui",
          "-lopencv_imgcodecs",
          "-lopencv_imgproc"
        ],
        "copies":[
          {
            'destination': './build/Release',
            'files':[
              'opencv/mac/lib/libopencv_core.4.5.1.dylib',
              'opencv/mac/lib/libopencv_core.4.5.dylib',
              'opencv/mac/lib/libopencv_core.dylib',
              'opencv/mac/lib/libopencv_features2d.4.5.1.dylib',
              'opencv/mac/lib/libopencv_features2d.4.5.dylib',
              'opencv/mac/lib/libopencv_features2d.dylib',
              'opencv/mac/lib/libopencv_highgui.4.5.1.dylib',
              'opencv/mac/lib/libopencv_highgui.4.5.dylib',
              'opencv/mac/lib/libopencv_highgui.dylib',
              'opencv/mac/lib/libopencv_imgcodecs.4.5.1.dylib',
              'opencv/mac/lib/libopencv_imgcodecs.4.5.dylib',
              'opencv/mac/lib/libopencv_imgcodecs.dylib',
              'opencv/mac/lib/libopencv_imgproc.4.5.1.dylib',
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
          "opencv/win/lib/"
        ],
        'msvs_settings': {
          'VCCLCompilerTool': {
            'ExceptionHandling': '1',    
            'AdditionalOptions': ['/EHsc']
          }
        },
        'libraries': [
          "opencv_world451.lib",
          "Rpcrt4.lib"
        ],
        "copies":[
          {
            'destination': './build/Release',
            'files':[
              'opencv/win/lib/opencv_world451.dll'
            ]
          }
        ]
      }]
    ]
  }]
}
