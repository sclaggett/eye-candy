/* eslint @typescript-eslint/no-explicit-any: 0 */

import Stimulus from './Stimulus';

export default class BarStimulus extends Stimulus {
  speed: number;

  width: number;

  angle: number;

  barColor: string;

  constructor() {
    super();
    this.speed = 0;
    this.width = 0;
    this.angle = 0;
    this.barColor = '';
  }
}
