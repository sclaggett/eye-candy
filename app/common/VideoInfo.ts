/* eslint @typescript-eslint/no-explicit-any: 0 */

export default class VideoInfo {
  outputDirectory: string;

  rootFileName: string;

  programName: string;

  programText: string;

  seed: number;

  width: number;

  height: number;

  fps: number;

  complete: boolean;

  constructor() {
    this.outputDirectory = '';
    this.rootFileName = '';
    this.programName = '';
    this.programText = '';
    this.seed = 0;
    this.width = 0;
    this.height = 0;
    this.fps = 0;
    this.complete = false;
  }
}
