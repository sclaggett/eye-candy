import Stimulus from '../../common/stimuli/Stimulus';
import VideoInfo from '../../common/VideoInfo';
import Checkerboard from './Checkerboard';
import Solid from './Solid';
import Wait from './Wait';

export default class StimulusFactory {
  static createStimulus(stimulus: Stimulus, videoInfo: VideoInfo) {
    switch (stimulus.stimulusType) {
      case 'CHECKERBOARD':
        return new Checkerboard(stimulus, videoInfo);

      case 'SOLID':
        return new Solid(stimulus, videoInfo);

      case 'WAIT':
        return new Wait(stimulus, videoInfo);

      default:
        throw new Error(`Unknown stimulus type: ${stimulus.stimulusType}`);
    }
  }
}
