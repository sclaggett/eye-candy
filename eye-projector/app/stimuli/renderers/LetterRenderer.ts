import Letter from '../types/Letter';
import Stimulus from '../types/Stimulus';
import StimulusRenderer from './StimulusRenderer';
import VideoInfo from '../../shared/VideoInfo';

export default class LetterRenderer extends StimulusRenderer {
  letter: Letter;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.letter = stimulus as Letter;

    console.log(
      `Created Letter stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
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

    context.fillStyle = this.letter.color;
    context.font = `${this.letter.size}px Sloan`;
    context.fillText(this.letter.letter, this.letter.x, this.letter.y);

    context.restore();
    this.stampFrame(context);
    this.frameNumber += 1;
  }
}
