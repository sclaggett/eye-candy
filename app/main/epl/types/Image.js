import Stimulus from './Stimulus';

export default class Image extends Stimulus {
  constructor(
    lifespan,
    backgroundColor,
    image,
    fixationPoint,
    scale,
    metadata
  ) {
    super(lifespan, backgroundColor, metadata);
    // Note: stimulus type must match actions.js
    this.stimulusType = 'IMAGE';
    // image can be a number (index) for client-side `renders` object that is stored in indexedDB
    this.image = image;
    // e.g. {x: 0, y: 0}
    this.fixationPoint = fixationPoint;
    // e.g. 1 for normal, or 2 for 2x height and 2x width
    // or [1,2] to scale only width by 2x
    this.scale = scale;
  }
}
