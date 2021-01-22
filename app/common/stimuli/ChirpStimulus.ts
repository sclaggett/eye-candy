/* eslint @typescript-eslint/no-explicit-any: 0 */

import Stimulus from './Stimulus';

export default class ChirpStimulus extends Stimulus {
  f0: number;

  f1: number;

  a0: number;

  a1: number;

  t1: number;

  phi: number;

  constructor() {
    super();
    this.f0 = 0;
    this.f1 = 0;
    this.a0 = 0;
    this.a1 = 0;
    this.t1 = 0;
    this.phi = 0;
  }
}
