import ChirpStimulus from '../../common/stimuli/ChirpStimulus';
import Stimulus from '../../common/stimuli/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../common/VideoInfo';

export default class Chirp extends StimulusBase {
  chirpStimulus: ChirpStimulus;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);
    this.chirpStimulus = stimulus as ChirpStimulus;

    console.log(
      `Created Chirp stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();

    let amplitude = 0;
    let scale = 0;
    if (this.frameNumber === 0) {
      amplitude = this.chirpStimulus.a0;
      scale = Math.cos(this.chirpStimulus.phi);
    } else {
      const timeDelta = this.frameNumber * (1 / this.videoInfo.fps);

      const timeFraction = Math.min(1, timeDelta / this.chirpStimulus.t1);
      amplitude =
        this.chirpStimulus.a0 * (1 - timeFraction) +
        this.chirpStimulus.a1 * timeFraction;

      // python code:
      // t = asarray(t)
      // if method in ['linear', 'lin', 'li']:
      //     beta = (f1 - f0) / t1
      //     phase = 2 * pi * (f0 * t + 0.5 * beta * t * t)
      const beta =
        (this.chirpStimulus.f1 - this.chirpStimulus.f0) / this.chirpStimulus.t1;
      const phase =
        2 *
        Math.PI *
        (this.chirpStimulus.f0 * timeDelta +
          0.5 * beta * timeDelta * timeDelta);
      scale = Math.cos(this.chirpStimulus.phi + phase);
    }

    // stay centered around gray
    let color;
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
