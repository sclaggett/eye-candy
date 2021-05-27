// index.js: This code is the JavaScript bridge between the functions that this
// module exports and the C++ wrapper defined in Wrapper.h.

/**
 * The way in which we load the native module is ununsual because we want to load it
 * in both main process and the renderer process. Everything works find for the main
 * process but the bindings will fail to resolve for the renderer. Solve this by having
 * the main process call getModuleRoot() before it invokes any other functions,
 * passing the root path to the renderer process, and having that process call
 * setModuleRoot() before any other functions.
 */
 
let native = null;

function getModuleRoot() {
  const bind = require('bindings');
  const path = require('path');
  let moduleRoot = bind.getRoot(bind.getFileName());
  native = bind('eyenative');
  return moduleRoot;
}

function setModuleRoot(moduleRoot) {
  if (native !== null) {
    return;
  }
  native = require('bindings')({
    'bindings': 'eyenative',
    'module_root': moduleRoot
  });
}

/**
 * The initialize() function should be called before any of the video-related functions
 * below to set the location of the ffmpeg and ffprobe executables and specify the
 * logging callback.
 */
function initialize(ffmpegPath, ffprobePath, logCallback) {
  if (native === null) {
    throw new Error('Native module has not been initialized');
  }
  native.initialize(ffmpegPath, ffprobePath, logCallback);
}

/**
 * Use the functions in this section to create a new video file, queue frames to be
 * written to that file, check periodically to see which frames have been processed,
 * and close the file when finished.
 */

function createVideoOutput(width, height, fps, outputPath) {
  if (native === null) {
    throw new Error('Native module has not been initialized');
  }
  return native.createVideoOutput(width, height, fps, outputPath);
}

function queueNextFrame(buffer, width, height) {
  if (native === null) {
    throw new Error('Native module has not been initialized');
  }
  return native.queueNextFrame(buffer, width, height);
}

function checkCompletedFrames() {
  if (native === null) {
    throw new Error('Native module has not been initialized');
  }
  return native.checkCompletedFrames();
}

function closeVideoOutput() {
  if (native === null) {
    throw new Error('Native module has not been initialized');
  }
  native.closeVideoOutput();
}

/**
 * Use the functions in this section to create a full screen window on the projector,
 * play a series of video file to it, and close when finished. The helper function
 * getDisplayFrequency() allows us to get a monitor's display frequency.
 */

function beginVideoPlayback(x, y, videos, scaleToFit, playbackDuration,
    playbackPosition) {
  if (native === null) {
    throw new Error('Native module has not been initialized');
  }
  return native.beginVideoPlayback(x, y, videos, scaleToFit, playbackDuration,
    playbackPosition);
}

function endVideoPlayback() {
  if (native === null) {
    throw new Error('Native module has not been initialized');
  }
  return native.endVideoPlayback();
}

function getDisplayFrequencies(x, y) {
  if (native === null) {
    throw new Error('Native module has not been initialized');
  }
  return native.getDisplayFrequencies(x, y);
}

/**
 * The functions in this section give us the ability to process a video in the main thread
 * and show a preview of it in a BrowserWindow, all without having to use the Electron
 * framework to pass the image between them. The channel should be created by the main
 * thread, and the browser window should open it, read each frame, and close it when
 * finished.
 */

function createPreviewChannel() {
  if (native === null) {
    throw new Error('Native module has not been initialized');
  }
  return native.createPreviewChannel();
}

function openPreviewChannel(name) {
  if (native === null) {
    throw new Error('Native module has not been initialized');
  }
  return native.openPreviewChannel(name);
}

function getNextFrame(maxWidth, maxHeight) {
  if (native === null) {
    throw new Error('Native module has not been initialized');
  }
  return native.getNextFrame(maxWidth, maxHeight);
}

function closePreviewChannel() {
  if (native === null) {
    throw new Error('Native module has not been initialized');
  }
  native.closePreviewChannel();
}

module.exports = {
  getModuleRoot,
  setModuleRoot,
  initialize,
  createVideoOutput,
  queueNextFrame,
  checkCompletedFrames,
  closeVideoOutput,
  beginVideoPlayback,
  endVideoPlayback,
  getDisplayFrequencies,
  createPreviewChannel,
  openPreviewChannel,
  getNextFrame,
  closePreviewChannel
};
