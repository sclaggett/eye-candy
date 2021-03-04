import Bar from '../types/Bar';
import Stimulus from '../types/Stimulus';
import StimulusRenderer from './StimulusRenderer';
import VideoInfo from '../../shared/VideoInfo';

export default class BarRenderer extends StimulusRenderer {
  bar: Bar;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.bar = stimulus as Bar;

    console.log(
      `Created Bar stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    const timeDelta = this.frameNumber * (1 / this.videoInfo.fps);
    const diagonalLength = this.getDiagonalLength(context);
    const r = diagonalLength / 2 - this.bar.speed * timeDelta;
    const x =
      (this.bar.width / 2) * Math.cos(-this.bar.angle) +
      r * Math.cos(-this.bar.angle) +
      context.canvas.clientWidth / 2;
    const y =
      (this.bar.width / 2) * Math.sin(-this.bar.angle) +
      r * Math.sin(-this.bar.angle) +
      context.canvas.clientHeight / 2;

    // might need to translate first if rotation
    context.translate(x, y);
    context.fillStyle = this.bar.barColor;
    // Rotate rectangle to be perpendicular with Center of Canvas
    context.rotate(-this.bar.angle);
    // Draw a rectangle, adjusting for Bar width
    context.fillRect(
      Math.round(-this.bar.width / 2),
      Math.round(-diagonalLength / 2),
      this.bar.width,
      diagonalLength
    );

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`Bar ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
