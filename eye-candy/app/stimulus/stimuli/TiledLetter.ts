import Stimulus from '../../shared/stimuli/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../shared/VideoInfo';

export default class TiledLetter extends StimulusBase {
  backgroundColor: string;

  letter: string;

  size: number;

  padding: number;

  color: string;

  angle: number;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.backgroundColor = stimulus.backgroundColor;
    this.letter = stimulus.letter;
    this.size = stimulus.size;
    this.padding = stimulus.padding;
    this.color = stimulus.color;
    this.angle = stimulus.angle;

    console.log(
      `Created TiledLetter stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    const canvasPattern: HTMLCanvasElement = document.createElement('canvas');
    canvasPattern.width = this.size + this.padding;
    canvasPattern.height = this.size + this.padding;
    const contextPattern: CanvasRenderingContext2D | null = canvasPattern.getContext(
      '2d'
    );
    if (contextPattern === null) {
      throw new Error('Failed to get context');
    }

    contextPattern.fillStyle = this.backgroundColor;
    contextPattern.fillRect(0, 0, canvasPattern.width, canvasPattern.height);

    contextPattern.fillStyle = this.color;
    contextPattern.font = `${this.size}px Sloan`;
    contextPattern.fillText(
      this.letter,
      this.padding / 2,
      this.padding / 2 + this.size
    );

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
    context.fillText(`TiledLetter ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
