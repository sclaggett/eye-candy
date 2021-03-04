import Stimulus from './Stimulus';

export default class Letter extends Stimulus {
  letter: string;

  x: number;

  y: number;

  size: number;

  color: string;

  constructor(
    lifespan: number,
    backgroundColor: string,
    letter: string,
    x: number,
    y: number,
    size: number,
    color: string,
    metadata: Record<string, any>
  ) {
    super(lifespan, backgroundColor, metadata, 'LETTER');

    this.letter = letter;
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
  }
}
