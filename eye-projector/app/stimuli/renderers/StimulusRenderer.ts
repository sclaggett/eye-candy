import Stimulus from '../types/Stimulus';
import VideoInfo from '../../shared/VideoInfo';

export default class StimulusRenderer {
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

  canSkipRendering(context: CanvasRenderingContext2D) {
    // We can't skip rendering the first frame or any frames at all if we're stamping them
    // with debugging info
    if (this.frameNumber === 0 || this.videoInfo.stampFrames) {
      return false;
    }

    // We need a way to convince the system that something has changed or we won't get the
    // frame from the offscreen renderer. The following approach works but there may be
    // a more efficient way to get the same result.
    const imageData = context.getImageData(
      0,
      0,
      context.canvas.width,
      context.canvas.height
    );
    context.putImageData(imageData, 0, 0, 0, 0, 1, 1);
    return true;
  }

  stampFrame(context: CanvasRenderingContext2D) {
    if (!this.videoInfo.stampFrames) {
      return;
    }
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(
      `${this.stimulus.stimulusType} ${this.frameNumber}`,
      50,
      50
    );
  }

  colorToRGB(colorName: string) {
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

  hexToRgb(hex: string) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const hexReplace = hex.replace(shorthandRegex, function (
      _m: string,
      r: string,
      g: string,
      b: string
    ) {
      return r + r + g + g + b + b;
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexReplace);
    if (!result) {
      throw new Error('Failed to convert hex to RGB');
    }
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
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
