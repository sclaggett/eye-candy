import Stimulus from './Stimulus';

export default class Checkerboard extends Stimulus {
  color: string;

  alternateColor: string;

  size: number;

  angle: number;

  constructor(
    lifespan: number,
    color: string,
    alternateColor: string,
    size: number,
    angle: number,
    metadata: Record<string, any>
  ) {
    super(lifespan, alternateColor, metadata, 'CHECKERBOARD');

    this.color = color;
    this.alternateColor = alternateColor;
    this.size = size;
    this.angle = angle;
  }
}
