import Stimulus from '../../shared/stimuli/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../shared/VideoInfo';

export default class Grating extends StimulusBase {
  speed: number;

  width: number;

  angle: number;

  barColor: string;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.speed = stimulus.speed;
    this.width = stimulus.width;
    this.angle = stimulus.angle;
    this.backgroundColor = stimulus.backgroundColor;
    this.barColor = stimulus.barColor;

    console.log(
      `Created Grating stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    const canvasPattern: HTMLCanvasElement = document.createElement('canvas');
    canvasPattern.width = this.width * 2;
    canvasPattern.height = this.width;
    const contextPattern: CanvasRenderingContext2D | null = canvasPattern.getContext(
      '2d'
    );
    if (contextPattern === null) {
      throw new Error('Failed to get context');
    }

    contextPattern.fillStyle = this.backgroundColor;
    contextPattern.fillRect(0, 0, canvasPattern.width, canvasPattern.height);

    contextPattern.fillStyle = this.barColor;
    contextPattern.fillRect(0, 0, this.width, this.width);

    const pattern: CanvasPattern | null = context.createPattern(
      canvasPattern,
      'repeat'
    );
    if (pattern === null) {
      throw new Error('Failed to create pattern');
    }

    context.fillStyle = pattern;

    const timeDelta = this.frameNumber * (1 / this.videoInfo.fps);
    const position = (this.speed * timeDelta) % (2 * this.width);
    const diag = Math.sqrt(
      context.canvas.width ** 2 + context.canvas.height ** 2
    );

    // move to the center of the canvas
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.rotate(-this.angle);
    context.translate(-diag / 2, -diag / 2);
    const x = this.width * 2 - position;
    context.translate(x, 0);
    context.fillRect(-this.width * 2, 0, diag + this.width * 2, diag);

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`Grating ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
