import BarRenderer from './BarRenderer';
import CheckerboardRenderer from './CheckerboardRenderer';
import ChirpRenderer from './ChirpRenderer';
import EyeChartRenderer from './EyeChartRenderer';
import GratingRenderer from './GratingRenderer';
import ImageRenderer from './ImageRenderer';
import LetterRenderer from './LetterRenderer';
import SinusoidalGratingRenderer from './SinusoidalGratingRenderer';
import SolidRenderer from './SolidRenderer';
import Stimulus from '../types/Stimulus';
import TiledLetterRenderer from './TiledLetterRenderer';
import VideoInfo from '../../shared/VideoInfo';
import WaitRenderer from './WaitRenderer';
import WhiteNoiseRenderer from './WhiteNoiseRenderer';

export default class StimulusFactory {
  static createRenderer(stimulus: Stimulus, videoInfo: VideoInfo) {
    switch (stimulus.stimulusType) {
      case 'BAR':
        return new BarRenderer(stimulus, videoInfo);

      case 'CHECKERBOARD':
        return new CheckerboardRenderer(stimulus, videoInfo);

      case 'CHIRP':
        return new ChirpRenderer(stimulus, videoInfo);

      case 'EYECHART':
        return new EyeChartRenderer(stimulus, videoInfo);

      case 'GRATING':
        return new GratingRenderer(stimulus, videoInfo);

      case 'IMAGE':
        return new ImageRenderer(stimulus, videoInfo);

      case 'LETTER':
        return new LetterRenderer(stimulus, videoInfo);

      case 'SINUSOIDAL_GRATING':
        return new SinusoidalGratingRenderer(stimulus, videoInfo);

      case 'SOLID':
        return new SolidRenderer(stimulus, videoInfo);

      case 'TILED_LETTER':
        return new TiledLetterRenderer(stimulus, videoInfo);

      case 'WAIT':
        return new WaitRenderer(stimulus, videoInfo);

      case 'WHITE_NOISE':
        return new WhiteNoiseRenderer(stimulus, videoInfo);

      default:
        throw new Error(`Unknown stimulus type: ${stimulus.stimulusType}`);
    }
  }
}
