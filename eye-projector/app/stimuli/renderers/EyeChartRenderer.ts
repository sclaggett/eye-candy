import EyeChart from '../types/EyeChart';
import Stimulus from '../types/Stimulus';
import StimulusRenderer from './StimulusRenderer';
import VideoInfo from '../../shared/VideoInfo';

export default class EyeChartRenderer extends StimulusRenderer {
  eyeChart: EyeChart;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.eyeChart = stimulus as EyeChart;

    console.log(
      `Created EyeChart stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
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

    const fullSize = this.eyeChart.size + this.eyeChart.padding;
    const numberOfRows = Math.ceil(context.canvas.clientHeight / fullSize);
    const numberOfCols = Math.ceil(context.canvas.clientWidth / fullSize);

    for (let i = 0; i < numberOfRows; i += 1) {
      for (let j = 0; j < numberOfCols; j += 1) {
        context.fillStyle = this.eyeChart.color;
        context.font = `${this.eyeChart.size}px Sloan`;
        const x = j * fullSize + this.eyeChart.padding / 2;
        const y = i * fullSize + this.eyeChart.size + this.eyeChart.padding / 2;
        context.fillText(this.eyeChart.letterMatrix[i][j], x, y);
      }
    }

    context.restore();
    this.stampFrame(context);
    this.frameNumber += 1;
  }
}
