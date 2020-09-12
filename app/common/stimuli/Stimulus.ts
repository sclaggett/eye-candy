/* eslint @typescript-eslint/no-explicit-any: 0 */

export default class Stimulus {
  age: number;

  backgroundColor: string;

  lifespan: number;

  metadata: Record<string, string>;

  stimulusType: string;

  constructor() {
    this.age = 0;
    this.backgroundColor = '';
    this.lifespan = 0;
    this.metadata = {};
    this.stimulusType = '';
  }
}
