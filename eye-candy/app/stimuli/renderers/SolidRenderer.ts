import Stimulus from '../types/Stimulus';
import StimulusRenderer from './StimulusRenderer';
import VideoInfo from '../../shared/VideoInfo';

export default class SolidRenderer extends StimulusRenderer {
  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);
    console.log(
      `Created Solid stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`Solid ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
