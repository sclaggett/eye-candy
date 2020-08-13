import Stimulus from './Stimulus';

export default class LetterSaccade extends Stimulus {
  constructor(
    lifespan,
    backgroundColor,
    letter,
    x,
    y,
    size,
    color,
    saccadeSize,
    metadata
  ) {
    // saccadeSize is a square of diameter 2*saccadeSize
    super(lifespan, backgroundColor, metadata);
    // Note: stimulus type must match actions.js
    this.stimulusType = 'LETTER';
    this.letter = letter;
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.saccadeSize = saccadeSize;
  }
}
