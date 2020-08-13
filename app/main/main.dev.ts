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
import { app, BrowserWindow } from 'electron';
import url from 'url';
import MenuBuilder from './menu';

const ipc = require('electron').ipcMain;

let controlWindow: BrowserWindow | null = null;
let stimulusWindow: BrowserWindow | null = null;

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

  const menuBuilder = new MenuBuilder(controlWindow);
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

  stimulusWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
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

  stimulusWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, '../stimulus/stimulus.html'),
      protocol: 'file:',
      slashes: true,
    })
  );

  // @TODO: Use "ready-to-show" event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  stimulusWindow.webContents.on('did-finish-load', () => {
    if (!stimulusWindow) {
      throw new Error('stimulusWindow is not defined');
    }
    if (process.env.START_MINIMIZED) {
      stimulusWindow.minimize();
    } else {
      stimulusWindow.show();
      stimulusWindow.focus();
    }
  });

  stimulusWindow.on('closed', () => {
    stimulusWindow = null;
  });

  const menuBuilder = new MenuBuilder(stimulusWindow);
  menuBuilder.buildMenu();
};

/**
 * The starting point for an electron application is when the ready event is
 * emitted by the framework.
 */

app.on('ready', () => {
  // TODO: Detect monitors before creating the control window
  createControlWindow();
});

/**
 * This IPC function will be called by the control window when the user wants
 * to start running an EPL program. It contains the name of the program and seed
 * as the parameters.
 */

const fs = require('fs');
const compileEPL = require('./epl/compile');

ipc.on('start-program', (...args: any[]) => {
  // Parse the arguments
  if (
    args.length !== 3 ||
    typeof args[1] !== 'string' ||
    typeof args[2] !== 'number'
  ) {
    throw new Error('Invalid number of arguments for "start-program"');
  }
  const programName: string = args[1] as string;
  const seed: number = args[2] as number;

  // Load the program from the file system
  fs.readFile(
    `./resources/programs/${programName}`,
    (err: Error, data: string) => {
      // Make sure the file was loaded successfully
      if (err) {
        throw err;
      }

      // Compile and initialize the program
      const program = compileEPL.compile(data, seed, 800, 600, '/data/');
      program.initialize();

      // Initialize the stimulus queue
      const stimulusQueue = [];
      for (let i = 0; i < 25; i += 1) {
        stimulusQueue.push(program.next());
      }
      console.log(`Stimulus queue: ${JSON.stringify(stimulusQueue)}`);
    }
  );
});

ipc.on('stupidTypeScript', () => {
  createStimulusWindow();
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
