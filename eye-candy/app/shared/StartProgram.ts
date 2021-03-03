/* eslint @typescript-eslint/no-explicit-any: 0 */

export default class StartProgram {
  outputDirectory: string;

  rootFileName: string;

  programName: string;

  programText: string;

  seed: number;

  width: number;

  height: number;

  ffmpegPath: string;

  fps: number;

  compileOnly: boolean;

  constructor() {
    this.outputDirectory = '';
    this.rootFileName = '';
    this.programName = '';
    this.programText = '';
    this.seed = 0;
    this.width = 0;
    this.height = 0;
    this.ffmpegPath = '';
    this.fps = 0;
    this.compileOnly = false;
  }
}
