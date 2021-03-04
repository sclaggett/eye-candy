import SinusoidalGrating from '../types/SinusoidalGrating';
import Stimulus from '../types/Stimulus';
import StimulusRenderer from './StimulusRenderer';
import VideoInfo from '../../shared/VideoInfo';

export default class SinusoidalGratingRenderer extends StimulusRenderer {
  sinusoidalGrating: SinusoidalGrating;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.sinusoidalGrating = stimulus as SinusoidalGrating;

    console.log(
      `Created SinusoidalGrating stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    const canvasPattern: HTMLCanvasElement = document.createElement('canvas');
    canvasPattern.width = this.sinusoidalGrating.width * 2;
    canvasPattern.height = this.sinusoidalGrating.width;
    const contextPattern: CanvasRenderingContext2D | null = canvasPattern.getContext(
      '2d'
    );
    if (contextPattern === null) {
      throw new Error('Failed to get context');
    }

    const maxColor = this.colorToRGB(this.sinusoidalGrating.barColor);
    const minColor = this.colorToRGB(this.sinusoidalGrating.backgroundColor);
    const colorScale = {
      r: (maxColor.r - minColor.r) / 2,
      g: (maxColor.g - minColor.g) / 2,
      b: (maxColor.b - minColor.b) / 2,
    };

    console.log(`## Width '${this.sinusoidalGrating.width}'`);
    for (let x = 0; x < this.sinusoidalGrating.width * 2; x += 1) {
      const scale = Math.sin((x / this.sinusoidalGrating.width) * Math.PI);
      // (b-a)/2 * sin(x) + a + (b-a)/2
      const r = Math.round(colorScale.r * scale + minColor.r + colorScale.r);
      const g = Math.round(colorScale.g * scale + minColor.g + colorScale.g);
      const b = Math.round(colorScale.b * scale + minColor.b + colorScale.b);
      contextPattern.fillStyle = this.rgbToHex(r, g, b);
      contextPattern.fillRect(x, 0, x + 1, canvasPattern.height);
    }

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
      (this.sinusoidalGrating.speed * timeDelta) %
      (2 * this.sinusoidalGrating.width);
    const diag = Math.sqrt(
      context.canvas.width ** 2 + context.canvas.height ** 2
    );

    // move to the center of the canvas
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.rotate(-this.sinusoidalGrating.angle);
    context.translate(-diag / 2, -diag / 2);
    context.translate(this.sinusoidalGrating.width * 2 - position, 0);
    context.fillRect(
      -this.sinusoidalGrating.width * 2,
      0,
      diag + this.sinusoidalGrating.width * 2,
      diag
    );

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`SinusoidalGrating ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
