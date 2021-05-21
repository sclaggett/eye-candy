export default class StartRun {
  outputName: string;

  ffmpegPath: string;

  projectorX: number;

  projectorY: number;

  projectorLatency: number;

  scaleToFit: boolean;

  videos: string[];

  metadata: string;

  fps: number;

  constructor() {
    this.outputName = '';
    this.ffmpegPath = '';
    this.projectorX = 0;
    this.projectorY = 0;
    this.projectorLatency = 0;
    this.scaleToFit = false;
    this.videos = [];
    this.metadata = '';
    this.fps = 0;
  }
}
