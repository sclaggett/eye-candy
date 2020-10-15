// const native = require('./build/Release/native.node');
const native = require('bindings')('native');

function initialize(ffmpegPath) {
  return native.initialize(ffmpegPath);
}

function open(filePath) {
  return native.open(filePath);
}

function write() {
  return native.write();
}

function close() {
  return native.close();
}

export { initialize, open, write, close };
