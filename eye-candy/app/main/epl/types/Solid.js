import Stimulus from './Stimulus';

export default class Solid extends Stimulus {
  constructor(lifespan, backgroundColor = 'white', metadata) {
    super(lifespan, backgroundColor, metadata);
    // Note: stimulus type must match actions.js
    this.stimulusType = 'SOLID';
  }
}
