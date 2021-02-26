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

import path from 'path';
import { app, BrowserWindow, dialog, nativeImage, Rectangle } from 'electron';
import url from 'url';
import MenuBuilder from './menu';
import ProgramNext from '../common/ProgramNext';
import StartProgram from '../common/StartProgram';
import Stimulus from '../common/stimuli/Stimulus';
import VideoInfo from '../common/VideoInfo';

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
  console.log('## File new');
}

function onFileOpen() {
  console.log('## File open');
}

function onFileSave() {
  console.log('## File save');
}

function onFileSaveAs() {
  console.log('## File save as');
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
let frameCleanTimer: ReturnType<typeof setTimeout> | null = null;
function startFrameCleanTimer() {
  if (frameCleanTimer !== null) {
    clearTimeout(frameCleanTimer);
  }
  frameCleanTimer = setTimeout(function () {
    const completed: string[] = eyeNative.checkCompletedFrames();
    for (let i = 0; i < completed.length; i += 1) {
      const id: string = completed[i];
      if (id in pendingFrames) {
        delete pendingFrames[id];
      }
    }
    if (Object.keys(pendingFrames).length !== 0) {
      startFrameCleanTimer();
    } else if (videoInfo !== null) {
      // TODO: Figure out exactly how many frames should be encoded and stop there. Discard
      // the first two frames which we know aren't valid
      console.log(
        `## Checking frame number ${videoInfo.frameNumber} against count ${videoInfo.frameCount}`
      );
      if (videoInfo.frameNumber >= videoInfo.frameCount) {
        log('Program complete\n');
        runStopped();
      }
    }
  }, 10);
}
function frameCaptured(image: nativeImage) {
  const size = image.getSize();
  const id: number = eyeNative.queueNextFrame(
    image.getBitmap(),
    size.width,
    size.height
  );
  pendingFrames[id] = image;
  if (videoInfo !== null) {
    videoInfo.frameNumber += 1;
  }
  startFrameCleanTimer();
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
 * The "selectOutputDirectory" IPC function will be called by the control window when
 * the user wants to select the output directory. The currently selected directory or
 * an empty string will be passed as the parameter.
 */
ipcMain.on('selectOutputDirectory', (event, initialDirectory: string) => {
  // Open a modal directory selection dialog
  if (controlWindow === null) {
    throw new Error(
      'Cannot select output directory when control window is null'
    );
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
  videoInfo.outputDirectory = args.outputDirectory;
  videoInfo.rootFileName = args.rootFileName;
  videoInfo.programName = args.programName;
  videoInfo.programText = args.programText;
  videoInfo.seed = args.seed;
  videoInfo.width = args.width;
  videoInfo.height = args.height;
  videoInfo.ffmpegPath = args.ffmpegPath;
  videoInfo.fps = args.fps;
  videoInfo.outputPath = path.join(
    videoInfo.outputDirectory,
    `${videoInfo.rootFileName}.mp4`
  );
}
function compileProgram() {
  // Compile and initialize the program
  if (!videoInfo) {
    throw new Error('Video info not defined');
  }
  log(`Compiling ${videoInfo.programName}... `);
  try {
    program = compileEPL.compile(
      videoInfo.programText,
      videoInfo.seed,
      videoInfo.width,
      videoInfo.height,
      '/data/'
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
  log('success\n');
  log('Generating stimuli... ');
  return true;
}
function generateStimuli() {
  // Generate all stimuli and keep track of the total duration. Note that this process may
  // need to be broken down into multiple steps for longer programs to prevent locking up
  // the application for longer periods of time.
  if (!program) {
    throw new Error('Program not defined');
  }
  let durationSecs = 0;
  while (true && durationSecs < 30) {
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
  log('Checking FFmpeg executable... ');
  try {
    fs.accessSync(videoInfo.ffmpegPath, fs.constants.X_OK);
  } catch (err) {
    log(`failed to find executable at ${videoInfo.ffmpegPath}\n`);
    return false;
  }
  log(`found\n`);

  // Check the FFmpeg version
  log('Detecting FFmpeg version... ');
  let result: string = execFileSync(videoInfo.ffmpegPath, [
    '-hide_banner',
    '-version',
  ]);
  let lines = result.toString().split(/\r?\n/);
  let version = '';
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes('ffmpeg version')) {
      const words = lines[i].split(' ');
      const { 2: ver } = words;
      version = ver;
    }
  }
  if (version === '') {
    log('failed to detect version\n');
    return false;
  }
  log(`${version}\n`);

  // We prefer to use a specialized hardware chip to encode H.264 video if one is
  // available. Determine the name of the hardware encoder by checking the platform
  let hwEncoder = '';
  if (process.platform === 'darwin') {
    hwEncoder = 'h264_videotoolbox';
  }
  const swEncoder = 'libx264';

  // Check if ffmpeg supports the hardware and software encoders
  log('Detecting H.264 encoders... ');
  result = execFileSync(videoInfo.ffmpegPath, ['-hide_banner', '-encoders']);
  lines = result.toString().split(/\r?\n/);
  let hwEncoderFound = false;
  let swEncoderFound = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (hwEncoder !== '' && lines[i].includes(hwEncoder)) {
      hwEncoderFound = true;
    }
    if (lines[i].includes(swEncoder)) {
      swEncoderFound = true;
    }
  }
  if (hwEncoderFound) {
    log('hardware encoder found\n');
    videoInfo.encoder = hwEncoder;
  } else if (swEncoderFound) {
    log('hardware encoder not found, falling back to software encoding\n');
    videoInfo.encoder = swEncoder;
  } else {
    log('failed\n');
    return false;
  }

  // Make sure ffmpeg supports the mp4 file format
  log('Checking output format... ');
  result = execFileSync(videoInfo.ffmpegPath, ['-hide_banner', '-muxers']);
  lines = result.toString().split(/\r?\n/);
  let mp4FormatFound = false;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes('mp4')) {
      mp4FormatFound = true;
      break;
    }
  }
  if (mp4FormatFound) {
    log('success\n');
  } else {
    log('failed\n');
    return false;
  }

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
    videoInfo.encoder,
    videoInfo.outputPath
  );
  if (result !== '') {
    log(`${result}\n`);
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
    log('Creating stimulus window... ');
    setTimeout(function () {
      createStimulusWindow();
      log('done\n');
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
 * The "endProgram" IPC function will be called by the stimulus window when it has
 * run out of stimuli to render. This function simply sets the flag and the encoding
 * process will be closed once all frames have been processed.
 */
ipcMain.on('endProgram', (_event) => {});

/**
 * The "getVideoInfo" IPC function will be called by the stimulus window to retrieve
 * details for the video we're recording.
 */
ipcMain.on('getVideoInfo', (event) => {
  event.returnValue = JSON.stringify(videoInfo);
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
