import Bar from './Bar';
import Checkerboard from './Checkerboard';
import Chirp from './Chirp';
import EyeChart from './EyeChart';
import Grating from './Grating';
import Image from './Image';
import Letter from './Letter';
import SinusoidalGrating from './SinusoidalGrating';
import Solid from './Solid';
import Stimulus from '../../shared/Stimulus';
import TiledLetter from './TiledLetter';
import VideoInfo from '../../shared/VideoInfo';
import Wait from './Wait';
import WhiteNoise from './WhiteNoise';

export default class StimulusFactory {
  static createStimulus(stimulus: Stimulus, videoInfo: VideoInfo) {
    switch (stimulus.stimulusType) {
      case 'BAR':
        return new Bar(stimulus, videoInfo);

      case 'CHECKERBOARD':
        return new Checkerboard(stimulus, videoInfo);

      case 'CHIRP':
        return new Chirp(stimulus, videoInfo);

      case 'EYECHART':
        return new EyeChart(stimulus, videoInfo);

      case 'GRATING':
        return new Grating(stimulus, videoInfo);

      case 'IMAGE':
        return new Image(stimulus, videoInfo);

      case 'LETTER':
        return new Letter(stimulus, videoInfo);

      case 'SINUSOIDAL_GRATING':
        return new SinusoidalGrating(stimulus, videoInfo);

      case 'SOLID':
        return new Solid(stimulus, videoInfo);

      case 'TILED_LETTER':
        return new TiledLetter(stimulus, videoInfo);

      case 'WAIT':
        return new Wait(stimulus, videoInfo);

      case 'WHITE_NOISE':
        return new WhiteNoise(stimulus, videoInfo);

      default:
        throw new Error(`Unknown stimulus type: ${stimulus.stimulusType}`);
    }
  }
}
