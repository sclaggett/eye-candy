/* eslint global-require: off, no-console: off */

/*
 * This module executes inside of electron's main process. This is where electron
 * renderer process are launched and communicated with using IPC.
 *
 * Despite the "dev" in this file's name it's actually where the main process starts
 * for both development and production. This file is compiled to "./app/main.prod.js"
 * when "yarn build" or "yarn build-main" are run. This is done using webpack to give
 * us some performance wins.
 *
 * Any log statements will be written to the terminal window.
 */

import path from 'path';
import { app, BrowserWindow } from 'electron';
import MenuBuilder from './menu';

let controlWindow: BrowserWindow | null = null;
let renderWindow: BrowserWindow | null = null;

/*
 * Install tools to aid in development and debugging. We use the "source-map-support"
 * library in production to produce useful stack traces and the "electron-debug"
 * library while debugging. Define a function that will be called by each render
 * window to install development tools while debugging.
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
 * Define an asychronous function that creates the main control window.
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
            preload: path.join(__dirname, 'dist/renderer.prod.js'),
          },
  });

  controlWindow.loadURL(`file://${__dirname}/../control/app.html`);

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
 * Define an asychronous function that creates the offscreen render window.
 */

const createRenderWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  renderWindow = new BrowserWindow({
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
            preload: path.join(__dirname, 'dist/renderer.prod.js'),
          },
  });

  renderWindow.loadURL(`file://${__dirname}/../render/app.html`);

  // @TODO: Use "ready-to-show" event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  renderWindow.webContents.on('did-finish-load', () => {
    if (!renderWindow) {
      throw new Error('renderWindow is not defined');
    }
    if (process.env.START_MINIMIZED) {
      renderWindow.minimize();
    } else {
      renderWindow.show();
      renderWindow.focus();
    }
  });

  renderWindow.on('closed', () => {
    renderWindow = null;
  });

  const menuBuilder = new MenuBuilder(renderWindow);
  menuBuilder.buildMenu();
};

/**
 * The starting point for an electron application is when the "ready" event is
 * emitted by the framework.
 */

app.on('ready', () => {
  // TODO: Detect monitors
  createControlWindow();
  createRenderWindow();
});

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (controlWindow === null) {
    createControlWindow();
  }
  if (renderWindow === null) {
    createRenderWindow();
  }
});
