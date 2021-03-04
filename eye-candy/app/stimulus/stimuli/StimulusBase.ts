import Stimulus from '../../shared/stimuli/Stimulus';
import VideoInfo from '../../shared/VideoInfo';

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

  colorToRGB(colorName) {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    const context: CanvasRenderingContext2D | null = canvas.getContext('2d');
    if (context === null) {
      throw new Error('Failed to get context');
    }
    context.fillStyle = colorName;
    const colorHex = context.fillStyle.toString();
    return this.hexToRgb(colorHex);
  }

  rgbToHex(red: number, green: number, blue: number) {
    return `#${((1 << 24) + (red << 16) + (green << 8) + blue)
      .toString(16)
      .slice(1)}`;
  }

  hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hexReplace = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b;
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexReplace);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
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
