import Stimulus from '../../shared/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../shared/VideoInfo';

export default class Chirp extends StimulusBase {
  f0: number;

  f1: number;

  a0: number;

  a1: number;

  t1: number;

  phi: number;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.f0 = stimulus.f0;
    this.f1 = stimulus.f1;
    this.a0 = stimulus.a0;
    this.a1 = stimulus.a1;
    this.t1 = stimulus.t1;
    this.phi = stimulus.phi;

    console.log(
      `Created Chirp stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();

    let amplitude = 0;
    let scale = 0;
    if (this.frameNumber === 0) {
      amplitude = this.a0;
      scale = Math.cos(this.phi);
    } else {
      const timeDelta = this.frameNumber * (1 / this.videoInfo.fps);

      const timeFraction = Math.min(1, timeDelta / this.t1);
      amplitude = this.a0 * (1 - timeFraction) + this.a1 * timeFraction;

      // python code:
      // t = asarray(t)
      // if method in ['linear', 'lin', 'li']:
      //     beta = (f1 - f0) / t1
      //     phase = 2 * pi * (f0 * t + 0.5 * beta * t * t)
      const beta = (this.f1 - this.f0) / this.t1;
      const phase =
        2 *
        Math.PI *
        (this.f0 * timeDelta + 0.5 * beta * timeDelta * timeDelta);
      scale = Math.cos(this.phi + phase);
    }

    // stay centered around gray
    const colorVal = Math.round(amplitude * scale + 127.5);
    context.fillStyle = this.rgbToHex(colorVal, colorVal, colorVal);
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`Chirp ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
