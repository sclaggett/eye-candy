/* eslint global-require: off, no-console: off */

/*
 * This module executes inside of electron's main process. This is where we can launch
 * electron renderer processes and communicate with them using IPC.
 *
 * Despite the "dev" in this file's name this is where the main process starts for both
 * development and production. This file will be compiled into "main.prod.js" by webpack
 * when "yarn build" or "yarn build-main" are run, an optimization that gives us some
 * performance wins.
 *
 * Any log statements will be written to the terminal window.
 */

import {
  app,
  BrowserWindow,
  dialog,
  nativeImage,
  Rectangle,
  screen,
} from 'electron';
import path from 'path';
import url from 'url';
import ProjectorInfo from '../shared/ProjectorInfo';
import StartRun from '../shared/StartRun';

const { execFileSync } = require('child_process');
const fs = require('fs');
const { ipcMain } = require('electron');
const eyeNative = require('eye-native');

// Load the native library and remember the module root so we can pass it to the control
// window when we set up the preview channel
const eyeNativeModuleRoot = eyeNative.getModuleRoot();

let controlWindow: BrowserWindow | null = null;
const durationMs = 0;

// Log segfault stack traces
const SegfaultHandler = require('segfault-handler');

SegfaultHandler.registerHandler('crash.log');

/*
 * Install tools to aid in development and debugging. We use the 'source-map-support'
 * library in production to produce useful stack traces and the 'electron-debug'
 * library while debugging. Define the 'installExtensions()' function that will be
 * called by each render window to install development tools.
 */
if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map((name) => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

/**
 * The log() function passes the given string to the control window where it will be appended
 * to the log text area.
 */
function log(message: string) {
  if (controlWindow && controlWindow.webContents) {
    controlWindow.webContents.send('log', message);
  }
}

/**
 * The runStopped() function cleans up any run in progress and notifies the control window.
 */
function runStopped(message) {
  // End video playback
  const result = eyeNative.endVideoPlayback();
  if (result !== '') {
    log(`Error stopping run: ${result}\n`);
  } else {
    log(`${message}\n`);
  }

  // Notify the control window
  if (controlWindow && controlWindow.webContents) {
    controlWindow.webContents.send('runStopped');
  }
}

/**
 * We don't use WebGL or 3D CSS animations so disable hardware acceleration to avoid
 * the overhead of compositing on the GPU.
 */
app.disableHardwareAcceleration();

/*
 * Define an asychronous function that creates the control window.
 */
const createControlWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  controlWindow = new BrowserWindow({
    show: false,
    width: 800,
    height: 850,
    webPreferences:
      (process.env.NODE_ENV === 'development' ||
        process.env.E2E_BUILD === 'true') &&
      process.env.ERB_SECURE !== 'true'
        ? {
            nodeIntegration: true,
          }
        : {
            preload: path.join(__dirname, '../dist/renderer.prod.js'),
          },
  });

  const controlUrl: string = url.format({
    pathname: path.join(__dirname, '../control/control.html'),
    protocol: 'file:',
    slashes: true,
  });
  controlWindow.loadURL(controlUrl);

  // @TODO: Use "ready-to-show" event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  controlWindow.webContents.on('did-finish-load', () => {
    if (!controlWindow) {
      throw new Error('controlWindow is not defined');
    }
    if (process.env.START_MINIMIZED) {
      controlWindow.minimize();
    } else {
      controlWindow.show();
      controlWindow.focus();
    }
  });

  controlWindow.on('closed', () => {
    controlWindow = null;
  });
};

/**
 * The starting point for an electron application is when the ready event is
 * emitted by the framework.
 */
app.on('ready', () => {
  // Create the control window
  createControlWindow();
});

/**
 * The "startRun" IPC function is invoked when the user wants to begin playing back a
 * series of video files to the projector.
 */
ipcMain.on('startRun', (_event, stringArg: string) => {
  /*
  // Deserialize the arguments
  const args: StartRun = JSON.parse(stringArg) as StartRun;

  // Check the executable path
  log('Checking FFmpeg executable...\n');
  try {
    fs.accessSync(args.ffmpegPath, fs.constants.X_OK);
  } catch (err) {
    log(`Error: Failed to find executable at ${args.ffmpegPath}\n`);
    return false;
  }

  // Check the FFmpeg version
  log('Detecting FFmpeg version...\n');
  let result: string = execFileSync(args.ffmpegPath, [
    '-hide_banner',
    '-version',
  ]);
  const lines = result.toString().split(/\r?\n/);
  let version = '';
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes('ffmpeg version')) {
      const words = lines[i].split(' ');
      const { 2: ver } = words;
      version = ver;
    }
  }
  if (version === '') {
    log('Error: Failed to detect version\n');
    return false;
  }
  log(`Detected version ${version}\n`);

  // Calculate the location of ffprobe under the assumption that it is located in the
  // same directory as ffmpeg
  let ffprobeName;
  if (process.platform === 'win32') {
    ffprobeName = 'ffprobe.exe';
  } else {
    ffprobeName = 'ffprobe';
  }
  const ffprobePath = path.join(path.parse(args.ffmpegPath).dir, ffprobeName);

  // Initialize the native library with the location of ffmpeg and the log callback
  // and start playing back the list of video files
  eyeNative.initialize(args.ffmpegPath, ffprobePath, log);
  result = eyeNative.beginVideoPlayback(
    args.projectorX,
    args.projectorY,
    args.videos,
    args.scaleToFit,
    playbackDuration,
    playbackPosition,
    playbackDelay
  );
  if (result !== '') {
    log(`Error: ${result}\n`);
    return false;
  }

  // Create the preview channel and pass it and the module root to the control window
  const channelName = eyeNative.createPreviewChannel();
  if (controlWindow && controlWindow.webContents) {
    controlWindow.webContents.send(
      'runPreviewChannel',
      eyeNativeModuleRoot,
      channelName
    );
  }
  */
  return true;
});

/**
 * The "cancelRun" IPC function will be called by the control window when the user
 * wants to cancel the current run.
 */
ipcMain.on('cancelRun', (_event) => {
  runStopped('Run terminated');
});

/**
 * Below are functions that make sure the electron application behaves properly
 * on Mac. The first keeps the main process running even when all windows are
 * closed while the second recreates the control window when the dock icon is
 * clicked if no other windows are open.
 */

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (controlWindow === null) {
    createControlWindow();
  }
});
