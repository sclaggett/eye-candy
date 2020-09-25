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

const ipc = require('electron').ipcMain;
const native = require('native');
const compileEPL = require('./epl/compile');

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
    (_event: Event, _dirty: Rectangle, _image: nativeImage) => {
      /*
      if (controlWindow === null) {
        return
      }
      let size: Size = image.getSize();
      controlWindow.webContents.send('previewBitmap', '', //image.toBitmap(),
        size.width, size.height);
      */
    }
  );
};

/**
 * We don't make use of WebGL or 3D CSS animations so disable hardware acceleration to
 * avoid the overhead of compositing on the GPU.
 */
app.disableHardwareAcceleration();

// const testNative = require('../../native/build/Release/native.node');
// const testNative = require("bindings")("native");
native.test();

/*
var PACKAGE_JSON = path.join(__dirname, 'package.json');
var binding_path = binary.find(path.resolve(PACKAGE_JSON));
var SerialPortBinding = require(binding_path);
*/

/**
 * The starting point for an electron application is when the ready event is
 * emitted by the framework.
 */
app.on('ready', () => {
  createControlWindow();
});

/**
 * The "selectOutputDirectory" IPC function will be called by the control window when
 * the user wants to select the output directory. The currently selected directory or
 * an empty string will be passed as the parameter.
 */
ipc.on('selectOutputDirectory', (event, initialDirectory: string) => {
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
 * The fillStimulusQueue() function attempts to fill the queue with a fixed number
 * of stimuli. It will set the "complete" flag if the end of the EPL program is reached.
 * Start by defining STIMULUS_QUEUE_SIZE which is the number of stimuli to queue up for
 * the stimulus window.
 */
const STIMULUS_QUEUE_SIZE = 20;
function fillStimulusQueue() {
  if (videoInfo === null) {
    throw new Error('Cannot fill stimulus queue when video info is null');
  }
  if (videoInfo.complete) {
    return;
  }
  if (program === null) {
    throw new Error('Unable to fill stimulus queue, program is null');
  }
  for (let i = 0; i < STIMULUS_QUEUE_SIZE; i += 1) {
    const response: ProgramNext = program.next() as ProgramNext;
    if (response.done) {
      videoInfo.complete = true;
      return;
    }
    if (response.value === null) {
      throw new Error('Program response did not contain a stimulus');
    }
    stimulusQueue.push(response.value);
  }
}

/**
 * The "startProgram" IPC function will be called by the control window when the user
 * wants to start running an EPL program. It contains the name of the program and seed
 * as the parameters.
 */
ipc.on('startProgram', (_event, stringArg: string) => {
  // Parse the argument
  const startProgramArgs: StartProgram = JSON.parse(stringArg) as StartProgram;

  // Copy the arguments to the video info
  videoInfo = new VideoInfo();
  videoInfo.outputDirectory = startProgramArgs.outputDirectory;
  videoInfo.rootFileName = startProgramArgs.rootFileName;
  videoInfo.programName = startProgramArgs.programName;
  videoInfo.programText = startProgramArgs.programText;
  videoInfo.seed = startProgramArgs.seed;
  videoInfo.width = startProgramArgs.width;
  videoInfo.height = startProgramArgs.height;
  videoInfo.fps = startProgramArgs.fps;

  // Reset our internal state variables
  stimulusWindow = null;
  program = null;
  stimulusQueue = [];

  // Compile, initialize the program, and fill the stimulus queue
  try {
    program = compileEPL.compile(
      videoInfo.programText,
      videoInfo.seed,
      videoInfo.width,
      videoInfo.height,
      '/data/'
    );
  } catch (e) {
    console.log('Error: ');
    if (e instanceof Error) {
      const error: Error = e as Error;
      console.log(`  Name: ${error.name}`);
      console.log(`  Message: ${error.message}`);
      console.log(`  Stack: ${error.stack}`);
    } else {
      throw e;
    }
    return;
  }
  if (program === null) {
    throw new Error('Failed to compile program');
  }

  program.initialize();
  fillStimulusQueue();

  // Create the stimulus window
  createStimulusWindow();
});

/**
 * The "getVideoInfo" IPC function will be called by the stimulus window to retrieve
 * details for the video we're recording.
 */
ipc.on('getVideoInfo', (event) => {
  event.returnValue = JSON.stringify(videoInfo);
});

/**
 * The "getStimulusBatch" IPC function will be called by the stimulus window to retrieve
 * the next batch of stimuli. It will return the next batch or an empty array if the
 * program has finished.
 */
ipc.on('getStimulusBatch', (event) => {
  // Return an empty batch if the program is complete.
  if (videoInfo === null) {
    throw new Error('Cannot get stimulus batch when video info is null');
  }
  if (videoInfo.complete) {
    event.returnValue = [];
    return;
  }

  // Synchronously fill the stimulus queue if it's empty. Note that this shouldn't happen
  // under normal operating conditions.
  if (stimulusQueue.length === 0) {
    fillStimulusQueue();
  }

  // The structured cloning algorithm has problems serializing stimuli for some reason. Work
  // around this by converting each object to a JSON string and parsing them to the correct
  // type on the receiving end.
  const duplicateQueue: string[] = [];
  for (let i = 0; i < stimulusQueue.length; i += 1) {
    duplicateQueue.push(JSON.stringify(stimulusQueue[i]));
  }
  event.returnValue = duplicateQueue;

  // Clear the stimulus queue and schedule it to be filled asynchronously so we have data
  // ready for a future call.
  stimulusQueue = [];
  setTimeout(fillStimulusQueue, 0);
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
