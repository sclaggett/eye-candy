import Stimulus from './Stimulus';

export default class Chirp extends Stimulus {
  f0: number;

  f1: number;

  a0: number;

  a1: number;

  t1: number;

  phi: number;

  constructor(
    lifespan: number,
    f0: number,
    f1: number,
    a0: number,
    a1: number,
    t1: number,
    phi: number,
    metadata: Record<string, any>
  ) {
    super(lifespan, 'black', metadata, 'CHIRP');

    // https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.chirp.html
    // f0 (float) Frequency (e.g. Hz) at time t=0.
    this.f0 = f0;
    // f1 (float) Frequency (e.g. Hz) of the waveform at time t1.
    this.f1 = f1;
    this.a0 = a0;
    this.a1 = a1;
    // t1 (float) Time at which f1 is specified.
    this.t1 = t1;
    // phi (float) Phase offset, in radians. Default is 0.
    this.phi = phi;
  }
}
