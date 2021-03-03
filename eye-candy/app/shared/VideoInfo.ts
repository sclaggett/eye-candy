/* eslint @typescript-eslint/no-explicit-any: 0 */

export default class VideoInfo {
  outputDirectory: string;

  rootFileName: string;

  programName: string;

  programText: string;

  seed: number;

  width: number;

  height: number;

  ffmpegPath: string;

  fps: number;

  encoder: string;

  outputPath: string;

  frameCount: number;

  frameNumber: number;

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
    this.encoder = '';
    this.outputPath = '';
    this.frameCount = 0;
    this.frameNumber = 0;
  }
}
