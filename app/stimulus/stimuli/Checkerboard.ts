import CheckerboardStimulus from '../../common/stimuli/CheckerboardStimulus';
import Stimulus from '../../common/stimuli/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../common/VideoInfo';

export default class Checkerboard extends StimulusBase {
  checkerboardStimulus: CheckerboardStimulus;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);
    this.checkerboardStimulus = stimulus as CheckerboardStimulus;

    console.log(
      `Created Checkerboard stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    const canvasPattern: HTMLCanvasElement = document.createElement('canvas');
    canvasPattern.width = this.checkerboardStimulus.size * 2;
    canvasPattern.height = this.checkerboardStimulus.size * 2;
    const contextPattern: CanvasRenderingContext2D | null = canvasPattern.getContext(
      '2d'
    );
    if (contextPattern === null) {
      throw new Error('Failed to get context');
    }

    contextPattern.fillStyle = this.checkerboardStimulus.alternateColor;
    contextPattern.fillRect(0, 0, canvasPattern.width, canvasPattern.height);

    contextPattern.fillStyle = this.checkerboardStimulus.color;
    contextPattern.fillRect(
      0,
      0,
      this.checkerboardStimulus.size,
      this.checkerboardStimulus.size
    );
    contextPattern.fillRect(
      this.checkerboardStimulus.size,
      this.checkerboardStimulus.size,
      this.checkerboardStimulus.size,
      this.checkerboardStimulus.size
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

    if (this.checkerboardStimulus.angle === 0) {
      context.fillRect(0, 0, diag, diag);
    } else {
      context.translate(context.canvas.width / 2, context.canvas.height / 2);
      context.rotate(-this.checkerboardStimulus.angle);
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
