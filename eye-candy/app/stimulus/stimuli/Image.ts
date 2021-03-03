import Stimulus from '../../shared/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../shared/VideoInfo';

export default class Image extends StimulusBase {
  image: string; // To be corrected

  fixationPoint: string; // To be corrected

  scale: number;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    // image can be a number (index) for client-side `renders` object that is stored in indexedDB
    this.image = stimulus.image;
    // e.g. {x: 0, y: 0}
    this.fixationPoint = stimulus.fixationPoint;
    // e.g. 1 for normal, or 2 for 2x height and 2x width
    // or [1,2] to scale only width by 2x
    this.scale = stimulus.scale;

    console.log(
      `Created Image stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`Image ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
