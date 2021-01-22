import Bar from './Bar';
import Checkerboard from './Checkerboard';
import Chirp from './Chirp';
import Solid from './Solid';
import Stimulus from '../../common/stimuli/Stimulus';
import VideoInfo from '../../common/VideoInfo';
import Wait from './Wait';

export default class StimulusFactory {
  static createStimulus(stimulus: Stimulus, videoInfo: VideoInfo) {
    switch (stimulus.stimulusType) {
      case 'BAR':
        return new Bar(stimulus, videoInfo);

      case 'CHECKERBOARD':
        return new Checkerboard(stimulus, videoInfo);

      case 'CHIRP':
        return new Chirp(stimulus, videoInfo);

      case 'SOLID':
        return new Solid(stimulus, videoInfo);

      case 'WAIT':
        return new Wait(stimulus, videoInfo);

      default:
        throw new Error(`Unknown stimulus type: ${stimulus.stimulusType}`);
    }
  }
}
