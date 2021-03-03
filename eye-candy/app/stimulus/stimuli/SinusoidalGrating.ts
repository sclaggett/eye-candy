import Stimulus from '../../shared/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../shared/VideoInfo';

export default class SinusoidalGrating extends StimulusBase {
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
      `Created SinusoidalGrating stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`SinusoidalGrating ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
