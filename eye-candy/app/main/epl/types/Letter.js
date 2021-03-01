import Stimulus from './Stimulus';

export default class Letter extends Stimulus {
  constructor(lifespan, backgroundColor, letter, x, y, size, color, metadata) {
    super(lifespan, backgroundColor, metadata);
    // Note: stimulus type must match actions.js
    this.stimulusType = 'LETTER';
    this.letter = letter;
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
  }
}
