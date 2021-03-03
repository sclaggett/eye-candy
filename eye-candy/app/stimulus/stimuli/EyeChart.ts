import Stimulus from '../../shared/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../shared/VideoInfo';

export default class EyeChart extends StimulusBase {
  letterMatrix: string[];

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

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`EyeChart ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
