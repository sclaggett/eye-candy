/* eslint @typescript-eslint/no-explicit-any: 0 */

import Stimulus from './Stimulus';

export default class CheckerboardStimulus extends Stimulus {
  color: string;

  alternateColor: string;

  size: number;

  angle: number;

  constructor() {
    super();
    this.color = '';
    this.alternateColor = '';
    this.size = 0;
    this.angle = 0;
  }
}
