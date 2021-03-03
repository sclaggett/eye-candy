import Stimulus from '../../shared/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../shared/VideoInfo';

export default class Checkerboard extends StimulusBase {
  color: string;

  alternateColor: string;

  size: number;

  angle: number;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.color = stimulus.color;
    this.alternateColor = stimulus.alternateColor;
    this.size = stimulus.size;
    this.angle = stimulus.angle;

    console.log(
      `Created Checkerboard stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    const canvasPattern: HTMLCanvasElement = document.createElement('canvas');
    canvasPattern.width = this.size * 2;
    canvasPattern.height = this.size * 2;
    const contextPattern: CanvasRenderingContext2D | null = canvasPattern.getContext(
      '2d'
    );
    if (contextPattern === null) {
      throw new Error('Failed to get context');
    }

    contextPattern.fillStyle = this.alternateColor;
    contextPattern.fillRect(0, 0, canvasPattern.width, canvasPattern.height);

    contextPattern.fillStyle = this.color;
    contextPattern.fillRect(0, 0, this.size, this.size);
    contextPattern.fillRect(this.size, this.size, this.size, this.size);

    const pattern: CanvasPattern | null = context.createPattern(
      canvasPattern,
      'repeat'
    );
    if (pattern === null) {
      throw new Error('Failed to create pattern');
    }

    context.fillStyle = pattern;

    const diag = Math.sqrt(
      context.canvas.width ** 2 + context.canvas.height ** 2
    );

    if (this.angle === 0) {
      context.fillRect(0, 0, diag, diag);
    } else {
      context.translate(context.canvas.width / 2, context.canvas.height / 2);
      context.rotate(-this.angle);
      context.translate(-diag / 2, -diag / 2);
      context.fillRect(0, 0, diag, diag);
    }

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`Checkerboard ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
