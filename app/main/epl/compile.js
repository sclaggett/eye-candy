// Compile and run EyeCandy Programming Language
// const {VM} = require('vm'); // TODO security risk, only for debug

// The vm2 project that we use to compile and run EPL code in a sandbox is not
// compatible with Webpack. The original discussion around this issue was quite
// uncivil:
//   https://github.com/patriksimek/vm2/issues/68
// It appears some work was done on the issue but it was never completed:
//   https://github.com/patriksimek/vm2/issues/70
// So the end result it that we're using a fork that is Webpack-compatible:
//   https://www.npmjs.com/package/@takeshape/vm2?activeTab=readme
// This works but certainly isn't ideal.
const { VM } = require('@takeshape/vm2');

const R = require('ramda');
const Types = require('./types');
const Render = require('./render');
const Random = require('./random');
const Misc = require('./misc');
const math = require('./math');

// The lint syntax checker really doesn't like console.log statements anywhere in
// production code which I sympathize with. However, it's nice to allow our EPL
// programs to write log statements. Define a global logging function here for use
// by all EPL programs that won't offend lint.
function eplLog(message) {
  // console.log(message);
}

// this object has all values usable in EPL
// TODO: should this also be available for preRenderFuncWrapper?
const EPL = {
  log: eplLog,
  JSON,
  R,
  ...Types,
  ...Render,
  ...Random,
  ...math,
  ...Misc,
};

function compile(programJS, seed, windowHeight, windowWidth, dataDir) {
  // console.log('compiling EPL.');
  // FOR VM2 (production)
  // note: if changing this, also must change preRenderFuncWrapper
  const vm = new VM({
    sandbox: {
      windowHeight,
      windowWidth,
      seed,
      dataDir,
      ...EPL,
    },
    console: 'inherit',
    compiler: 'javascript',
  });
  // ---- FOR VM2 ----

  // FOR VM (testing)
  // const sandbox = Object.assign({
  //     windowHeight: windowHeight,
  //     windowWidth: windowWidth,
  //     seed: seed,
  // }, EPL)
  // const vm = VM.createContext(sandbox)
  // ---- FOR VM ----

  // initialize program
  vm.run(
    `
    let r = new DeterministicRandom(seed);
    ${programJS}
    `
  );

  // console.log('reading program metadata');
  const metadata = vm.run('metadata');
  // this function will be passed as string and run on client. websocket cannot send a function
  const preRenderFunc = vm.run(
    `
    if (typeof preRenderFunc !== 'undefined') {
      preRenderFunc.toString()
    } else {
      'function* preRenderFunc() {}'
    }
    `
  );

  // preRenderArgs is an object that has either args (an array)
  // or keys njobs (int value) and indices (0..njobs-1) with array values

  // amazingly, without binding {} to preRenderDefault means object is ignored
  // #javascriptquirk

  // console.log('eval preRenderArgs');
  const preRenderArgs = vm.run(
    `
    let preRenderDefault = {args: [undefined]};
    if (typeof preRenderArgs !== "undefined") {
      preRenderArgs
    } else {
      preRenderDefault
    }
    `
  );
  // console.log('eval preRenderArgs success');

  function initialize() {
    // console.log('Initializing EPL stimulus generator');

    vm.run(
      `
      let generator = stimulusGenerator();
      let s = 'uninitialized';
      let si = 0;
      `
    );
  }

  function nextStimulus() {
    return vm.run(
      `
      s = generator.next();
      s.stimulusIndex = si;
      si++;
      s;
      `
    );
  }
  // console.log('preRenderArgs', preRenderArgs);
  return {
    vm,
    metadata,
    preRenderFunc,
    preRenderArgs,
    initialize,
    next: nextStimulus,
    epl: programJS,
  };
}

exports.compile = compile;
