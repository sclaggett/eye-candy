import Stimulus from './Stimulus';

export default class EyeChart extends Stimulus {
  constructor(
    lifespan,
    backgroundColor,
    letterMatrix,
    size,
    padding,
    color,
    metadata
  ) {
    super(lifespan, backgroundColor, metadata);
    // Note: stimulus type must match actions.js
    this.stimulusType = 'EYECHART';
    this.letterMatrix = letterMatrix;
    this.size = size;
    this.padding = padding;
    this.color = color;
  }
}
