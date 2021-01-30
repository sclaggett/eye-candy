import BarStimulus from '../../common/stimuli/BarStimulus';
import Stimulus from '../../common/stimuli/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../common/VideoInfo';

export default class Bar extends StimulusBase {
  barStimulus: BarStimulus;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);
    this.barStimulus = stimulus as BarStimulus;

    console.log(
      `Created Bar stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    const timeDelta = this.frameNumber * (1 / this.videoInfo.fps);
    const diagonalLength = this.getDiagonalLength(context);
    const r = diagonalLength / 2 - this.barStimulus.speed * timeDelta;
    const x =
      (this.barStimulus.width / 2) * Math.cos(-this.barStimulus.angle) +
      r * Math.cos(-this.barStimulus.angle) +
      context.canvas.clientWidth / 2;
    const y =
      (this.barStimulus.width / 2) * Math.sin(-this.barStimulus.angle) +
      r * Math.sin(-this.barStimulus.angle) +
      context.canvas.clientHeight / 2;

    // might need to translate first if rotation
    context.translate(x, y);
    context.fillStyle = this.barStimulus.barColor;
    // Rotate rectangle to be perpendicular with Center of Canvas
    context.rotate(-this.barStimulus.angle);
    // Draw a rectangle, adjusting for Bar width
    context.fillRect(
      Math.round(-this.barStimulus.width / 2),
      Math.round(-diagonalLength / 2),
      this.barStimulus.width,
      diagonalLength
    );

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`Bar ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
