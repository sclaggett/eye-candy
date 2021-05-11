import Grating from '../types/Grating';
import Stimulus from '../types/Stimulus';
import StimulusRenderer from './StimulusRenderer';
import VideoInfo from '../../shared/VideoInfo';

export default class GratingRenderer extends StimulusRenderer {
  grating: Grating;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.grating = stimulus as Grating;

    console.log(
      `Created Grating stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    const canvasPattern: HTMLCanvasElement = document.createElement('canvas');
    canvasPattern.width = this.grating.width * 2;
    canvasPattern.height = this.grating.width;
    const contextPattern: CanvasRenderingContext2D | null = canvasPattern.getContext(
      '2d'
    );
    if (contextPattern === null) {
      throw new Error('Failed to get context');
    }

    contextPattern.fillStyle = this.grating.backgroundColor;
    contextPattern.fillRect(0, 0, canvasPattern.width, canvasPattern.height);

    contextPattern.fillStyle = this.grating.barColor;
    contextPattern.fillRect(0, 0, this.grating.width, this.grating.width);

    const pattern: CanvasPattern | null = context.createPattern(
      canvasPattern,
      'repeat'
    );
    if (pattern === null) {
      throw new Error('Failed to create pattern');
    }

    context.fillStyle = pattern;

    const timeDelta = this.frameNumber * (1 / this.videoInfo.fps);
    const position =
      (this.grating.speed * timeDelta) % (2 * this.grating.width);
    const diag = Math.sqrt(
      context.canvas.width ** 2 + context.canvas.height ** 2
    );

    // move to the center of the canvas
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.rotate(-this.grating.angle);
    context.translate(-diag / 2, -diag / 2);
    const x = this.grating.width * 2 - position;
    context.translate(x, 0);
    context.fillRect(
      -this.grating.width * 2,
      0,
      diag + this.grating.width * 2,
      diag
    );

    context.restore();
    this.stampFrame(context);
    this.frameNumber += 1;
  }
}
