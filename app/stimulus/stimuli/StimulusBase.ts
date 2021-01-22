import Stimulus from '../../common/stimuli/Stimulus';
import VideoInfo from '../../common/VideoInfo';

export default class StimulusBase {
  stimulus: Stimulus;

  videoInfo: VideoInfo;

  frameNumber: number;

  frameCount: number;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    this.stimulus = stimulus;
    this.videoInfo = videoInfo;
    this.frameNumber = 0;
    this.frameCount = stimulus.lifespan * videoInfo.fps;
  }

  hasFrames() {
    return this.frameNumber < this.frameCount;
  }

  rgbToHex(red, green, blue) {
    return `#${((1 << 24) + (red << 16) + (green << 8) + blue)
      .toString(16)
      .slice(1)}`;
  }

  getDiagonalLength(context: CanvasRenderingContext2D) {
    const width = context.canvas.clientWidth;
    const height = context.canvas.clientHeight;
    return Math.sqrt(width ** 2 + height ** 2);
  }

  renderBackground(context: CanvasRenderingContext2D) {
    context.fillStyle = this.stimulus.backgroundColor;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
  }

  render(_context: CanvasRenderingContext2D) {
    throw new Error('Derived classes must implement the render() function');
  }
}
