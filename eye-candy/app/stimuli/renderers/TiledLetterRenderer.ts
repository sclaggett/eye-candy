import Stimulus from '../types/Stimulus';
import StimulusRenderer from './StimulusRenderer';
import TiledLetter from '../types/TiledLetter';
import VideoInfo from '../../shared/VideoInfo';

export default class TiledLetterRenderer extends StimulusRenderer {
  tiledLetter: TiledLetter;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.tiledLetter = stimulus as TiledLetter;

    console.log(
      `Created TiledLetter stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    // This stimulus doesn't change after the first frame so skip all render calls except the first
    if (this.canSkipRendering(context)) {
      this.frameNumber += 1;
      return;
    }

    context.save();
    this.renderBackground(context);

    const canvasPattern: HTMLCanvasElement = document.createElement('canvas');
    canvasPattern.width = this.tiledLetter.size + this.tiledLetter.padding;
    canvasPattern.height = this.tiledLetter.size + this.tiledLetter.padding;
    const contextPattern: CanvasRenderingContext2D | null = canvasPattern.getContext(
      '2d'
    );
    if (contextPattern === null) {
      throw new Error('Failed to get context');
    }

    contextPattern.fillStyle = this.tiledLetter.backgroundColor;
    contextPattern.fillRect(0, 0, canvasPattern.width, canvasPattern.height);

    contextPattern.fillStyle = this.tiledLetter.color;
    contextPattern.font = `${this.tiledLetter.size}px Sloan`;
    contextPattern.fillText(
      this.tiledLetter.letter,
      this.tiledLetter.padding / 2,
      this.tiledLetter.padding / 2 + this.tiledLetter.size
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

    if (this.tiledLetter.angle === 0) {
      context.fillRect(0, 0, diag, diag);
    } else {
      context.translate(context.canvas.width / 2, context.canvas.height / 2);
      context.rotate(-this.tiledLetter.angle);
      context.translate(-diag / 2, -diag / 2);
      context.fillRect(0, 0, diag, diag);
    }

    context.restore();
    this.stampFrame(context);
    this.frameNumber += 1;
  }
}
