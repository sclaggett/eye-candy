/* eslint @typescript-eslint/no-explicit-any: 0 */

export default class StartProgram {
  programName: string;

  seed: number;

  width: number;

  height: number;

  fps: number;

  constructor() {
    this.programName = '';
    this.seed = 0;
    this.width = 0;
    this.height = 0;
    this.fps = 0;
  }
}
