/* eslint @typescript-eslint/no-explicit-any: 0 */

import Stimulus from './stimuli/Stimulus';

export default class ProgramNext {
  done: boolean;

  stimulusIndex: number;

  value: Stimulus | null;

  constructor() {
    this.done = false;
    this.stimulusIndex = 0;
    this.value = null;
  }
}
