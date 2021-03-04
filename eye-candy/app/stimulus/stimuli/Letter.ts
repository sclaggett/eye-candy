import Stimulus from '../../shared/stimuli/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../shared/VideoInfo';

export default class Letter extends StimulusBase {
  letter: string;

  x: number;

  y: number;

  size: number;

  color: string;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.letter = stimulus.letter;
    this.x = stimulus.x;
    this.y = stimulus.y;
    this.size = stimulus.size;
    this.color = stimulus.color;

    console.log(
      `Created Letter stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    context.fillStyle = this.color;
    context.font = `${this.size}px Sloan`;
    context.fillText(this.letter, this.x, this.y);

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`Letter ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
