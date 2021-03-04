import Stimulus from '../../shared/stimuli/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../shared/VideoInfo';

export default class Bar extends StimulusBase {
  speed: number;

  width: number;

  angle: number;

  barColor: string;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.speed = stimulus.speed;
    this.width = stimulus.width;
    this.angle = stimulus.angle;
    this.barColor = stimulus.barColor;

    console.log(
      `Created Bar stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    const timeDelta = this.frameNumber * (1 / this.videoInfo.fps);
    const diagonalLength = this.getDiagonalLength(context);
    const r = diagonalLength / 2 - this.speed * timeDelta;
    const x =
      (this.width / 2) * Math.cos(-this.angle) +
      r * Math.cos(-this.angle) +
      context.canvas.clientWidth / 2;
    const y =
      (this.width / 2) * Math.sin(-this.angle) +
      r * Math.sin(-this.angle) +
      context.canvas.clientHeight / 2;

    // might need to translate first if rotation
    context.translate(x, y);
    context.fillStyle = this.barColor;
    // Rotate rectangle to be perpendicular with Center of Canvas
    context.rotate(-this.angle);
    // Draw a rectangle, adjusting for Bar width
    context.fillRect(
      Math.round(-this.width / 2),
      Math.round(-diagonalLength / 2),
      this.width,
      diagonalLength
    );

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`Bar ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
