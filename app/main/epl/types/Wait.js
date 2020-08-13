import Stimulus from './Stimulus';

export default class Wait extends Stimulus {
  constructor(lifespan, metadata) {
    super(lifespan, 'black', metadata);
    // Note: stimulus type must match actions.js
    this.stimulusType = 'WAIT';
  }
}
