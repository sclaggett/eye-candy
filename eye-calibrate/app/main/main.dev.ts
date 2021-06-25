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

import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import url from 'url';

const { ipcMain, dialog } = require('electron');

const eyeNative = require('eye-native');

eyeNative.getModuleRoot();

let controlWindow: BrowserWindow | null = null;

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
 * The noSignalDetected() and averageLatency() functions are invoked repeatedly by the
 * calibration thread as it attempts to measure the latency in the system. The results
 * are passed to the control window for display.
 */
function noSignalDetected() {
  if (controlWindow && controlWindow.webContents) {
    controlWindow.webContents.send('signalUpdate', false, null);
  }
}

function averageLatency(avgLatency: string) {
  if (controlWindow && controlWindow.webContents) {
    controlWindow.webContents.send('signalUpdate', true, avgLatency);
  }
}

/**
 * The runStopped() function cleans up any run in progress and notifies the control window.
 */
function runStopped() {
  eyeNative.endCalibration();
  if (controlWindow && controlWindow.webContents) {
    controlWindow.webContents.send('runStopped');
  }
}

/**
 * In the case of the calibration process, and log messages indicate and error. Display the
 * error to the user and stop the run.
 */
function log(message: string) {
  dialog.showMessageBox({
    type: 'error',
    message,
  });
  runStopped();
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
    width: 900,
    height: 550,
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
 * The "startRun" IPC function is invoked when the user wants to begin calibrating
 * the display system.
 */
ipcMain.on('startRun', (_event) => {
  // Detect displays and assume the secondary display is the projector
  const displays = screen.getAllDisplays();
  const projector = displays.find((display) => {
    return display.bounds.x !== 0 || display.bounds.y !== 0;
  });
  if (!projector) {
    dialog.showMessageBox({
      type: 'error',
      message: 'Projector not found.',
    });
    runStopped();
    return;
  }

  // Initialize the native library and start the calibration process
  eyeNative.initialize('', '', log);
  const result = eyeNative.beginCalibration(
    projector.bounds.x + projector.bounds.width / 2,
    projector.bounds.y + projector.bounds.height / 2,
    noSignalDetected,
    averageLatency
  );
  if (result !== '') {
    dialog.showMessageBox({
      type: 'error',
      message: result,
    });
    runStopped();
  }
});

/**
 * The "cancelRun" IPC function will be called by the control window when the user
 * wants to stop the current run.
 */
ipcMain.on('stopRun', (_event) => {
  runStopped();
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
