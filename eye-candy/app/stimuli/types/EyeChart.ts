import Stimulus from './Stimulus';

export default class EyeChart extends Stimulus {
  letterMatrix: string[][];

  size: number;

  padding: number;

  color: string;

  constructor(
    lifespan: number,
    backgroundColor: string,
    letterMatrix: string[][],
    size: number,
    padding: number,
    color: string,
    metadata: Record<string, any>
  ) {
    super(lifespan, backgroundColor, metadata, 'EYECHART');

    this.letterMatrix = letterMatrix;
    this.size = size;
    this.padding = padding;
    this.color = color;
  }
}
