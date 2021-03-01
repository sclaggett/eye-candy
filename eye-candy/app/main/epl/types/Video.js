import Stimulus from './Stimulus';

export default class Video extends Stimulus {
  constructor(lifespan, backgroundColor, src, startTime, metadata) {
    super(lifespan, backgroundColor, metadata);
    // Note: stimulus type must match actions.js
    this.stimulusType = 'VIDEO';
    this.startTime = startTime;
    this.src = src;
  }
}
