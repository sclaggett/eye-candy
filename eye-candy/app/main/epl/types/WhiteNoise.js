import Stimulus from './Stimulus';

export default class WhiteNoise extends Stimulus {
  constructor(lifespan, rows, cols, color, metadata) {
    super(lifespan, 'black', metadata);
    // Note: stimulus type must match actions.js
    this.stimulusType = 'WHITE_NOISE';
    this.rows = rows;
    this.cols = cols;
    this.color = color;
  }
}
