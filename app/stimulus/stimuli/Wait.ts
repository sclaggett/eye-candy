import Stimulus from '../../common/stimuli/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../common/VideoInfo';

export default class Wait extends StimulusBase {
  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    console.log(
      `Created Wait stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`Wait ${this.frameNumber}`, 30, 30);
    this.frameNumber += 1;
  }
}
