import Chirp from '../types/Chirp';
import Stimulus from '../types/Stimulus';
import StimulusRenderer from './StimulusRenderer';
import VideoInfo from '../../shared/VideoInfo';

export default class ChirpRenderer extends StimulusRenderer {
  chirp: Chirp;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.chirp = stimulus as Chirp;

    console.log(
      `Created Chirp stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();

    let amplitude = 0;
    let scale = 0;
    if (this.frameNumber === 0) {
      amplitude = this.chirp.a0;
      scale = Math.cos(this.chirp.phi);
    } else {
      const timeDelta = this.frameNumber * (1 / this.videoInfo.fps);

      const timeFraction = Math.min(1, timeDelta / this.chirp.t1);
      amplitude =
        this.chirp.a0 * (1 - timeFraction) + this.chirp.a1 * timeFraction;

      // python code:
      // t = asarray(t)
      // if method in ['linear', 'lin', 'li']:
      //     beta = (f1 - f0) / t1
      //     phase = 2 * pi * (f0 * t + 0.5 * beta * t * t)
      const beta = (this.chirp.f1 - this.chirp.f0) / this.chirp.t1;
      const phase =
        2 *
        Math.PI *
        (this.chirp.f0 * timeDelta + 0.5 * beta * timeDelta * timeDelta);
      scale = Math.cos(this.chirp.phi + phase);
    }

    // stay centered around gray
    const colorVal = Math.round(amplitude * scale + 127.5);
    context.fillStyle = this.rgbToHex(colorVal, colorVal, colorVal);
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    context.restore();
    this.stampFrame(context);
    this.frameNumber += 1;
  }
}
