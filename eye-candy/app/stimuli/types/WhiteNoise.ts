import Stimulus from './Stimulus';

export default class WhiteNoise extends Stimulus {
  rows: number;

  cols: number;

  color: string;

  constructor(
    lifespan: number,
    rows: number,
    cols: number,
    color: string,
    metadata: Record<string, any>
  ) {
    super(lifespan, 'black', metadata, 'WHITE_NOISE');

    this.rows = rows;
    this.cols = cols;
    this.color = color;
  }
}
