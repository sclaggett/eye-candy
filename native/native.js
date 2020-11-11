// const native = require('./build/Release/native.node');
const native = require('bindings')('native');

function initialize(ffmpegPath) {
  native.initialize(ffmpegPath);
}

function open(width, height, fps, encoder, outputPath) {
  return native.open(width, height, fps, encoder, outputPath);
}

function write(buffer, width, height) {
  return native.write(buffer, width, height);
}

function checkCompleted() {
  return native.checkCompleted();
}

function close() {
  native.close();
}

export { initialize, open, write, checkCompleted, close };
