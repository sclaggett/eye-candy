import Stimulus from './Stimulus';

export default class SinusoidalGrating extends Stimulus {
  constructor(
    lifespan,
    backgroundColor,
    speed,
    width,
    angle,
    barColor,
    metadata
  ) {
    super(lifespan, backgroundColor, metadata);
    // Note: stimulus type must match actions.js
    this.stimulusType = 'SINUSOIDAL_GRATING';
    this.speed = speed;
    this.width = width;
    this.angle = angle;
    this.barColor = barColor;
  }
}
