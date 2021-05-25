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
import MenuBuilder from './menu';
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
let durationMs = 0;

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
 * TODO: The following functions are invoked from the menu bar.
 */

function onFileNew() {
  console.log('## File new\n');
}

function onFileOpen() {
  console.log('## File open\n');
}

function onFileSave() {
  console.log('## File save\n');
}

function onFileSaveAs() {
  console.log('## File save as\n');
}

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
 * The playbackDuration() and playbackProgress() functions pass the total duration of the
 * video files and the current position, both in seconds, to the control window for
 * display to the user.
 */
function playbackDuration(duration: number) {
  durationMs = duration;
  if (controlWindow && controlWindow.webContents) {
    controlWindow.webContents.send('playbackDuration', duration);
  }
}
function playbackPosition(position: number) {
  if (controlWindow && controlWindow.webContents) {
    controlWindow.webContents.send('playbackPosition', position);
  }
  if (position >= durationMs) {
    runStopped('Run complete');
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
    width: 600,
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

  const menuBuilder = new MenuBuilder(
    controlWindow,
    onFileNew,
    onFileOpen,
    onFileSave,
    onFileSaveAs
  );
  menuBuilder.buildMenu();
};

/**
 * The function below will notify the control window of any changes to the
 * list of displays.
 */
function onDisplayChange() {
  if (controlWindow && controlWindow.webContents) {
    controlWindow.webContents.send('displayChange');
  }
}

/**
 * The starting point for an electron application is when the ready event is
 * emitted by the framework.
 */
app.on('ready', () => {
  // Listen for displaying being added, removed, or changed
  screen.on('display-added', (event, newDisplay) => {
    onDisplayChange();
  });
  screen.on('display-removed', (event, oldDisplay) => {
    onDisplayChange();
  });
  screen.on('display-metrics-changed', (event, display, changedMetrics) => {
    onDisplayChange();
  });

  // Create the control window
  createControlWindow();
});

/**
 * The "detectProjector" IPC function will be called by the control window when it wants
 * to check the status of any attached projector. Assume the primary display is the
 * user's main monitor and any secondary display is the projector.
 */
ipcMain.handle('detectProjector', async (_event: Event) => {
  const displays = screen.getAllDisplays();
  const projector = displays.find((display) => {
    return display.bounds.x !== 0 || display.bounds.y !== 0;
  });
  if (projector) {
    const projInfo: ProjectorInfo = new ProjectorInfo();
    projInfo.x = projector.bounds.x;
    projInfo.y = projector.bounds.y;
    projInfo.width = projector.bounds.width;
    projInfo.height = projector.bounds.height;
    projInfo.fps = eyeNative.getDisplayFrequency(
      projector.bounds.x + projector.bounds.width / 2,
      projector.bounds.y + projector.bounds.height / 2
    );
    return projInfo;
  }
  return null;
});

/**
 * The "getHomeDirectory" IPC function will be called by the control window when it
 * wants to retrieve the current user's home directory.
 */
ipcMain.handle('getHomeDirectory', async (_event: Event) => {
  return app.getPath('home');
});

/**
 * The "selectRootDirectory" IPC function will be called by the control window when
 * the user wants to select the root directory. The currently selected directory or
 * an empty string will be passed as the parameter.
 */
ipcMain.on('selectRootDirectory', (event, initialDirectory: string) => {
  // Open a modal directory selection dialog
  if (controlWindow === null) {
    throw new Error('Cannot select root directory when control window is null');
  }
  const result: string[] | undefined = dialog.showOpenDialogSync(
    controlWindow,
    {
      defaultPath: initialDirectory,
      properties: ['openDirectory', 'createDirectory'],
    }
  );

  // Pass the selected directory to the control window
  if (result !== undefined && result.length > 0) {
    [event.returnValue] = result;
  } else {
    event.returnValue = null;
  }
});

/**
 * The "selectFfmpegPath" IPC function will be called by the control window when
 * the user wants to select the ffmpeg executable. The currently selected path or
 * an empty string will be passed as the parameter.
 */
ipcMain.on('selectFfmpegPath', (event, initialPath: string) => {
  // Open a modal file selection dialog
  if (controlWindow === null) {
    throw new Error('Cannot select ffmpeg path when control window is null');
  }
  const result: string[] | undefined = dialog.showOpenDialogSync(
    controlWindow,
    {
      defaultPath: initialPath,
      properties: ['openFile'],
    }
  );

  // Pass the selected path to the control window
  if (result !== undefined && result.length > 0) {
    [event.returnValue] = result;
  } else {
    event.returnValue = null;
  }
});

/**
 * The "selectVideo" IPC function will be called by the control window when
 * the user wants to select an mp4 video file.
 */
ipcMain.on('selectVideo', (event) => {
  // Open a modal file selection dialog
  if (controlWindow === null) {
    throw new Error('Cannot select video when control window is null');
  }
  const result: string[] | undefined = dialog.showOpenDialogSync(
    controlWindow,
    {
      properties: ['openFile'],
      filters: [
        { name: 'Movies', extensions: ['mp4'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    }
  );

  // Pass the selected video to the control window
  if (result !== undefined && result.length > 0) {
    [event.returnValue] = result;
  } else {
    event.returnValue = null;
  }
});

/**
 * The "startRun" IPC function is invoked when the user wants to begin playing back a
 * series of video files to the projector.
 */
ipcMain.on('startRun', (_event, stringArg: string) => {
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
    playbackPosition
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
