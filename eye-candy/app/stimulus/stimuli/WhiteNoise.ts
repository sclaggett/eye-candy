import Stimulus from '../../shared/stimuli/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../shared/VideoInfo';

export default class WhiteNoise extends StimulusBase {
  rows: number;

  cols: number;

  color: string;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);
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

    const nVals = this.cols * this.rows;
    const flatPixelArray = new Uint8ClampedArray(nVals * 4);
    for (let p = 0; p < nVals; p += 1) {
      const val = randn_bm();
      flatPixelArray[p * 4] = val; // red
      flatPixelArray[p * 4 + 1] = val; // green
      flatPixelArray[p * 4 + 2] = val; // blue
      flatPixelArray[p * 4 + 3] = 255; // alpha
    }
    const imageData = new ImageData(flatPixelArray, this.cols, this.rows);
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
}
