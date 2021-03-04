import Stimulus from './Stimulus';

export default class TiledLetter extends Stimulus {
  letter: string;

  size: number;

  padding: number;

  color: string;

  angle: number;

  constructor(
    lifespan: number,
    backgroundColor: string,
    letter: string,
    size: number,
    padding: number,
    color: string,
    angle: number,
    metadata: Record<string, any>
  ) {
    super(lifespan, backgroundColor, metadata, 'TILED_LETTER');

    this.letter = letter;
    this.size = size;
    this.padding = padding;
    this.color = color;
    this.angle = angle;
  }
}
