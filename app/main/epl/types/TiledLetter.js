import Stimulus from './Stimulus';

export default class TiledLetter extends Stimulus {
  constructor(
    lifespan,
    backgroundColor,
    letter,
    size,
    padding,
    color,
    angle,
    metadata
  ) {
    super(lifespan, backgroundColor, metadata);
    // Note: stimulus type must match actions.js
    this.stimulusType = 'TILED_LETTER';
    this.letter = letter;
    this.size = size;
    this.padding = padding;
    this.color = color;
    this.angle = angle;
  }
}
