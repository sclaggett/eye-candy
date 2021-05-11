/* eslint @typescript-eslint/no-explicit-any: 0 */

export default class StartProgram {
  rootDirectory: string;

  outputName: string;

  ffmpegPath: string;

  seed: number;

  stampFrames: boolean;

  saveStimuli: boolean;

  limitSeconds: number;

  width: number;

  height: number;

  fps: number;

  programName: string;

  programText: string;

  compileOnly: boolean;

  constructor() {
    this.rootDirectory = '';
    this.outputName = '';
    this.ffmpegPath = '';
    this.seed = 0;
    this.stampFrames = false;
    this.saveStimuli = false;
    this.limitSeconds = 0;
    this.width = 0;
    this.height = 0;
    this.fps = 0;
    this.programName = '';
    this.programText = '';
    this.compileOnly = false;
  }
}
