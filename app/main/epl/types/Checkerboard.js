import Stimulus from './Stimulus';

export default class Checkerboard extends Stimulus {
  constructor(lifespan, color, alternateColor, size, angle, metadata) {
    super(lifespan, alternateColor, metadata);
    // Note: stimulus type must match actions.js
    this.stimulusType = 'CHECKERBOARD';
    this.color = color;
    this.alternateColor = alternateColor;
    this.size = size;
    this.angle = angle;
    // TODO try deleting--unecessary?
    this.count = 0;
  }
}
