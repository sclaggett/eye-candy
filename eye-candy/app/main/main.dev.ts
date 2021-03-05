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

import { app, BrowserWindow, dialog, nativeImage, Rectangle } from 'electron';
import path from 'path';
import url from 'url';
import Image from '../stimuli/types/Image';
import MenuBuilder from './menu';
import ProgramNext from '../shared/ProgramNext';
import StartProgram from '../shared/StartProgram';
import Stimulus from '../stimuli/types/Stimulus';
import VideoInfo from '../shared/VideoInfo';

const { execFileSync } = require('child_process');
const fs = require('fs');
const { ipcMain } = require('electron');
const eyeNative = require('eye-native');
const compileEPL = require('./epl/compile');

// Load the native library and remember the module root so we can pass it to the control
// window when we set up the preview channel
const eyeNativeModuleRoot = eyeNative.getModuleRoot();

let controlWindow: BrowserWindow | null = null;
let stimulusWindow: BrowserWindow | null = null;

// Details of the video we're recording
let videoInfo: VideoInfo | null = null;

// Compiled EPL program
let program: Record<string, any> | null = null;

// Queue of stimuli that haven't been played yet
let stimulusQueue: Stimulus[] = [];

// Set of all images paths which will be passed to the stimulus window for preloading
const imageSet = new Set();

// The stimulus window will produce blank frames before the first stimulus image.
// Retain all images in an array until we're notified of the first frame number.
let earlyFrameQueue: nativeImage[] = [];
let firstFrameNumber = -1;

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
function runStopped() {
  // Close the stimulus window
  if (stimulusWindow) {
    stimulusWindow.close();
    stimulusWindow = null;
  }

  // Close out video encoding
  eyeNative.closeVideoOutput();

  // Reset internal state variables
  program = null;
  stimulusQueue = [];
  imageSet.clear();
  earlyFrameQueue = [];
  firstFrameNumber = -1;

  // Notify the control window
  if (controlWindow && controlWindow.webContents) {
    controlWindow.webContents.send('runStopped');
  }
}

/**
 * Stimulus frames that have been captured need to be passed to the native code for further
 * processing, and while that is happening we need to retain a reference to the javascript
 * object so it stays valid. The following variables and function keep track of which
 * frames have been submitted for processing and purge completed frame from the list at
 * 10 ms intervals.
 */
const pendingFrames: { [index: string]: any } = {};
let frameCleanTimer: ReturnType<typeof setInterval> | null = null;
function startFrameCleanTimer() {
  if (frameCleanTimer !== null) {
    throw new Error('Frame clean time is already running');
    return;
  }
  frameCleanTimer = setInterval(function () {
    // Get an array of completed frames and delete them from our cache
    const completed: string[] = eyeNative.checkCompletedFrames();
    for (let i = 0; i < completed.length; i += 1) {
      const id: string = completed[i];
      if (id in pendingFrames) {
        delete pendingFrames[id];
      }
    }

    // Notify the control window of our progress
    if (!videoInfo) {
      return;
    }
    const framesProcessing = Object.keys(pendingFrames).length;
    if (controlWindow && controlWindow.webContents) {
      controlWindow.webContents.send(
        'runProgress',
        videoInfo.frameNumber - firstFrameNumber - framesProcessing,
        videoInfo.frameCount
      );
    }

    // Detect when recording is complete and stop the run
    if (
      framesProcessing === 0 &&
      videoInfo.frameNumber >= videoInfo.frameCount + firstFrameNumber
    ) {
      if (frameCleanTimer !== null) {
        clearInterval(frameCleanTimer);
        frameCleanTimer = null;
      }
      log('Program complete\n');
      runStopped();
    }
  }, 30);
}
function frameCaptured(image: nativeImage) {
  // The stimulus window produces a series of blank frames before we get the first
  // frame of the program. Retain all frames until we know the first frame number.
  if (videoInfo === null) {
    return;
  }
  if (firstFrameNumber === -1) {
    earlyFrameQueue.push(image);
    videoInfo.frameNumber += 1;
    return;
  }

  // Handle the case where we've just been informed of the first frame number. We
  // detect this by the early frame queue not being empty.
  if (earlyFrameQueue.length > 0) {
    // Pass each image since the first frame to the native layer and remember the
    // IDs that they are assigned
    for (let i = firstFrameNumber; i < earlyFrameQueue.length; i += 1) {
      const earlyImage = earlyFrameQueue[i];
      const size = earlyImage.getSize();
      const id: number = eyeNative.queueNextFrame(
        earlyImage.getBitmap(),
        size.width,
        size.height
      );
      pendingFrames[id] = earlyImage;
    }

    // Clear the queue and start the frame cleanup timer
    earlyFrameQueue = [];
    startFrameCleanTimer();
  }

  // Discard any frames beyond the last one that we expect while waiting for FFmpeg to
  // process any frames that are queued up
  if (videoInfo.frameNumber >= videoInfo.frameCount + firstFrameNumber) {
    return;
  }

  // Pass the new image to the native layer, remember the ID that it is assigned,
  // and increment the frame number
  const size = image.getSize();
  const id: number = eyeNative.queueNextFrame(
    image.getBitmap(),
    size.width,
    size.height
  );
  pendingFrames[id] = image;
  videoInfo.frameNumber += 1;
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
    width: 1150,
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

/*
 * Define an asychronous function that creates the offscreen stimulus window.
 */
const createStimulusWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  if (videoInfo === null) {
    throw new Error('Cannot create stimulus window when video info is null');
  }
  stimulusWindow = new BrowserWindow({
    show: false,
    width: videoInfo.width,
    height: videoInfo.height,
    webPreferences:
      (process.env.NODE_ENV === 'development' ||
        process.env.E2E_BUILD === 'true') &&
      process.env.ERB_SECURE !== 'true'
        ? {
            offscreen: true,
            nodeIntegration: true,
          }
        : {
            offscreen: true,
            preload: path.join(__dirname, '../dist/renderer.prod.js'),
          },
  });

  stimulusWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, '../stimulus/stimulus.html'),
      protocol: 'file:',
      slashes: true,
    })
  );

  // This function will be invoked for each frame that is rendered by the
  // stimlulus window.
  stimulusWindow.webContents.on(
    'paint',
    (_event: Event, _dirty: Rectangle, image: nativeImage) => {
      frameCaptured(image);
    }
  );
};

/**
 * The starting point for an electron application is when the ready event is
 * emitted by the framework.
 */
app.on('ready', () => {
  createControlWindow();
});

/**
 * The "getHomeDirectory" IPC function will be called by the control window when it
 * wants to retrieve the current user's home directory.
 */
ipcMain.handle('getHomeDirectory', async (_event: Event) => {
  return app.getPath('home');
});

/**
 * The "getProgramsDirectory" IPC function will be called by the control window when
 * it wants to retrieve the relative path to the programs directory.
 */
ipcMain.handle('getProgramsDirectory', async (_event: Event) => {
  return path.join(__dirname, '../resources/programs');
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
  // Open a modal directory selection dialog
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
 * The "startProgram" IPC function is invoked when the user wants to compile and
 * optionally start an EPL program. This is where all the action happens.
 *
 * Many of the steps in this process can lock up the entire application by consuming
 * the main thread. We keep the application responsive by pausing frequently to allow
 * the UI to update. What follows are functions representing steps in the process and
 * the final function that pulls them all together.
 */
function setState(args: StartProgram) {
  // Copy the arguments to the video info
  videoInfo = new VideoInfo();
  videoInfo.rootDirectory = args.rootDirectory;
  videoInfo.outputName = args.outputName;
  videoInfo.ffmpegPath = args.ffmpegPath;
  videoInfo.seed = args.seed;
  videoInfo.stampFrames = args.stampFrames;
  videoInfo.saveStimuli = args.saveStimuli;
  videoInfo.limitSeconds = args.limitSeconds;
  videoInfo.width = args.width;
  videoInfo.height = args.height;
  videoInfo.fps = args.fps;
  videoInfo.programName = args.programName;
  videoInfo.programText = args.programText;
  const outputDirectory = path.join(
    videoInfo.rootDirectory,
    videoInfo.outputName
  );
  videoInfo.infoPath = path.join(
    outputDirectory,
    `${videoInfo.outputName}.epl`
  );
  videoInfo.stimuliPath = path.join(
    outputDirectory,
    `${videoInfo.outputName}.stim`
  );
  videoInfo.videoPath = path.join(
    outputDirectory,
    `${videoInfo.outputName}.mp4`
  );
  videoInfo.programPath = path.join(
    outputDirectory,
    `${videoInfo.outputName}.js`
  );
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }
}
function compileProgram() {
  // Compile and initialize the program
  if (!videoInfo) {
    throw new Error('Video info not defined');
  }
  log(`Compiling ${videoInfo.programName}...\n`);
  try {
    program = compileEPL.compile(
      videoInfo.programText,
      videoInfo.seed,
      videoInfo.width,
      videoInfo.height,
      '/data/',
      (message: string) => {
        log(`[epl] ${message}\n`);
      }
    );
    if (program === null) {
      throw new Error('Failed to compile program');
    }
  } catch (e) {
    if (e instanceof Error) {
      const error: Error = e as Error;
      let message = 'Error:\n';
      message += `  Name: ${error.name}\n`;
      message += `  Message: ${error.message}\n`;
      message += `  Stack: ${error.stack}\n`;
      log(message);
    } else {
      throw e;
    }
    return false;
  }
  program.initialize();
  log('Generating stimuli...\n');
  return true;
}
function generateStimuli() {
  // Generate all stimuli while keeping track of a what images need to be preloaded and
  // the total duration of the program. Limit the program to a specific number of seconds
  // for debugging purposes if directed to by the user.
  //
  // Note that this process may need to be broken down into multiple steps for longer/
  // programs to prevent locking up the application for unacceptable periods of time.
  if (!program) {
    throw new Error('Program not defined');
  }
  let durationSecs = 0;
  while (true) {
    const response: ProgramNext = program.next() as ProgramNext;
    if (response.done) {
      break;
    }
    if (response.value === null) {
      throw new Error('Program response did not contain a stimulus');
    }
    const stimulus: Stimulus = response.value as Stimulus;
    durationSecs += stimulus.lifespan;
    stimulusQueue.push(stimulus);
    if (stimulus.stimulusType === 'IMAGE') {
      imageSet.add((stimulus as Image).image);
    }
    if (
      videoInfo !== null &&
      videoInfo.limitSeconds !== 0 &&
      durationSecs >= videoInfo.limitSeconds
    ) {
      break;
    }
  }

  // Log the total duration
  const secs: number = durationSecs % 60;
  const durationMin: number = (durationSecs - secs) / 60;
  const min: number = durationMin % 60;
  const hrs: number = (durationMin - min) / 60;
  let duration = '';
  if (hrs > 0) {
    duration += `${hrs} hours, `;
  }
  if (hrs > 0 || min > 0) {
    duration += `${min} mins, `;
  }
  duration += `${secs.toFixed(1)} sec`;
  log(`${stimulusQueue.length} total, ${duration}\n`);

  // Calculate the total number of frames we expect
  if (videoInfo !== null) {
    videoInfo.frameCount = durationSecs * videoInfo.fps;
  }
}
function checkFFmpeg() {
  // Check the executable path
  if (!videoInfo) {
    throw new Error('Video info not defined');
  }
  log('Checking FFmpeg executable...\n');
  try {
    fs.accessSync(videoInfo.ffmpegPath, fs.constants.X_OK);
  } catch (err) {
    log(`Error: Failed to find executable at ${videoInfo.ffmpegPath}\n`);
    return false;
  }

  // Check the FFmpeg version
  log('Detecting FFmpeg version...\n');
  const result: string = execFileSync(videoInfo.ffmpegPath, [
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

  return true;
}
function spawnFFmpeg() {
  // Initialize the native library with the location of ffmpeg and open the output
  // file for writing
  if (videoInfo === null) {
    return false;
  }
  eyeNative.initializeFfmpeg(videoInfo.ffmpegPath);
  const result: string = eyeNative.createVideoOutput(
    videoInfo.width,
    videoInfo.height,
    videoInfo.fps,
    videoInfo.videoPath
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
}
ipcMain.on('startProgram', (_event, stringArg: string) => {
  // Deserialize the arguments
  const args: StartProgram = JSON.parse(stringArg) as StartProgram;

  // Set the state and compile the program
  setState(args);
  if (!compileProgram()) {
    runStopped();
    return;
  }

  // Wait 200 ms and generate all stimuli
  setTimeout(function () {
    generateStimuli();

    // Stop here if we're only compiling
    if (args.compileOnly) {
      runStopped();
      return;
    }

    // Check the FFmpeg executable and spawn it
    if (!checkFFmpeg() || !spawnFFmpeg()) {
      runStopped();
      return;
    }

    // Wait 200 ms and create the stimulus window
    log('Creating stimulus window...\n');
    setTimeout(function () {
      createStimulusWindow();
    }, 200);
  }, 200);
});

/**
 * The "cancelProgram" IPC function will be called by the control window when the user
 * wants to cancel the running EPL program.
 */
ipcMain.on('cancelProgram', (_event) => {
  log('Program terminated\n');
  runStopped();
});

/**
 * The "startStimuli" IPC function will be called by the stimulus window with the
 * number of the first frame containing the first stimulus image. This is necessary
 * because preloading images can take time so we need to discard early frames.
 */
ipcMain.on('startStimuli', (_event, frameNumber: number) => {
  firstFrameNumber = frameNumber;
});

/**
 * The "programFailure" IPC function will be called by the stimulus window if the
 * program encounters a fatal error.
 */
ipcMain.on('programFailure', (_event, message: string) => {
  log(`Program failure: ${message}`);
  runStopped();
});

/**
 * The "getVideoInfo" IPC function will be called by the stimulus window to retrieve
 * details for the video we're recording.
 */
ipcMain.on('getVideoInfo', (event) => {
  event.returnValue = JSON.stringify(videoInfo);
});

/**
 * The "getImageSet" IPC function will be called by the stimulus window to retrieve a
 * list of all images that need to be preloaded before the run begin.
 */
ipcMain.on('getImageSet', (event) => {
  console.log(`## Send image set of size: ${imageSet.size}`);
  event.returnValue = imageSet;
});

/**
 * The "getStimulusBatch" IPC function will be called by the stimulus window to retrieve
 * the next batch of stimuli. It will return the next batch or an empty array if the
 * program has finished.
 */
const BATCH_SIZE = 50;
ipcMain.on('getStimulusBatch', (event) => {
  // Return an empty batch if the program is complete.
  if (videoInfo === null) {
    throw new Error('Cannot get stimulus batch when video info is null');
  }
  if (stimulusQueue.length === 0) {
    event.returnValue = [];
    return;
  }

  // The structured cloning algorithm has problems serializing stimuli for some reason. Work
  // around this by converting each object to a JSON string and parsing them to the correct
  // type on the receiving end.
  const duplicateQueue: string[] = [];
  let i = 0;
  for (i = 0; i < stimulusQueue.length && i < BATCH_SIZE; i += 1) {
    duplicateQueue.push(JSON.stringify(stimulusQueue[i]));
  }
  event.returnValue = duplicateQueue;
  stimulusQueue = stimulusQueue.slice(i);
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
