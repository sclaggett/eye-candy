import Stimulus from './Stimulus';

export default class Chirp extends Stimulus {
  // https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.chirp.html
  constructor(lifespan, f0, f1, a0, a1, t1, phi, metadata) {
    // f0 (float) Frequency (e.g. Hz) at time t=0.
    // t1 (float) Time at which f1 is specified.
    // f1 (float) Frequency (e.g. Hz) of the waveform at time t1.
    // phi (float) Phase offset, in radians. Default is 0.
    const backgroundColor = 'black';
    super(lifespan, backgroundColor, metadata);
    // Note: stimulus type must match actions.js
    this.stimulusType = 'CHIRP';
    this.f0 = f0;
    this.f1 = f1;
    this.a0 = a0;
    this.a1 = a1;
    this.t1 = t1;
    this.phi = phi;
  }
}
