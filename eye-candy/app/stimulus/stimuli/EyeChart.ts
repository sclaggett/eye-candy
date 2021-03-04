import Stimulus from '../../shared/stimuli/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../shared/VideoInfo';

export default class EyeChart extends StimulusBase {
  letterMatrix: string[][];

  size: number;

  padding: number;

  color: string;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.letterMatrix = stimulus.letterMatrix;
    this.size = stimulus.size;
    this.padding = stimulus.padding;
    this.color = stimulus.color;

    console.log(
      `Created EyeChart stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    const fullSize = this.size + this.padding;
    const numberOfRows = Math.ceil(context.canvas.clientHeight / fullSize);
    const numberOfCols = Math.ceil(context.canvas.clientWidth / fullSize);

    for (let i = 0; i < numberOfRows; i += 1) {
      for (let j = 0; j < numberOfCols; j += 1) {
        context.fillStyle = this.color;
        context.font = `${this.size}px Sloan`;
        const x = j * fullSize + this.padding / 2;
        const y = i * fullSize + this.size + this.padding / 2;
        context.fillText(this.letterMatrix[i][j], x, y);
      }
    }

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`EyeChart ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
