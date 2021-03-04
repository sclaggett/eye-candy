import Stimulus from '../types/Stimulus';
import StimulusRenderer from './StimulusRenderer';
import WhiteNoise from '../types/WhiteNoise';
import VideoInfo from '../../shared/VideoInfo';

export default class WhiteNoiseRenderer extends StimulusRenderer {
  whiteNoise: WhiteNoise;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.whiteNoise = stimulus as WhiteNoise;

    console.log(
      `Created WhiteNoise stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    const canvasPattern: HTMLCanvasElement = document.createElement('canvas');
    canvasPattern.width = context.canvas.width;
    canvasPattern.height = context.canvas.height;
    const contextPattern: CanvasRenderingContext2D | null = canvasPattern.getContext(
      '2d'
    );
    if (contextPattern === null) {
      throw new Error('Failed to get context');
    }

    const nVals = this.whiteNoise.cols * this.whiteNoise.rows;
    const flatPixelArray = new Uint8ClampedArray(nVals * 4);
    for (let p = 0; p < nVals; p += 1) {
      const val = this.randn_bm();
      flatPixelArray[p * 4] = val; // red
      flatPixelArray[p * 4 + 1] = val; // green
      flatPixelArray[p * 4 + 2] = val; // blue
      flatPixelArray[p * 4 + 3] = 255; // alpha
    }
    const imageData = new ImageData(
      flatPixelArray,
      this.whiteNoise.cols,
      this.whiteNoise.rows
    );
    contextPattern.putImageData(imageData, 0, 0);

    context.imageSmoothingEnabled = false;
    context.drawImage(
      imageData,
      0,
      0,
      context.canvas.width,
      context.canvas.height
    );

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`WhiteNoise ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }

  randn_bm(): number {
    // normal distribution between [0,255]
    // https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve/39187274#39187274
    let u = 0;
    let v = 0;
    while (u === 0) {
      u = Math.random(); // Converting [0,1) to (0,1)
    }
    while (v === 0) {
      v = Math.random();
    }
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) {
      return this.randn_bm(); // resample between 0 and 1
    }
    // convert to [0,255]
    const n = Math.round(num ** (1 / 2.2) * 255);
    return n;
  }
}
