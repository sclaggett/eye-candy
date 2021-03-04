/* eslint @typescript-eslint/no-explicit-any: 0 */

import Stimulus from './Stimulus';

export default class Image extends Stimulus {
  image: string;

  fixationPoint: string;

  scale: number;

  constructor() {
    super();
    this.image = '';
    this.fixationPoint = '';
    this.scale = 0;
  }
}
