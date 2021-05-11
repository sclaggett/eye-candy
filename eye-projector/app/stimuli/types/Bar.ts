import Stimulus from './Stimulus';

export default class Bar extends Stimulus {
  speed: number;

  width: number;

  angle: number;

  barColor: string;

  constructor(
    lifespan: number,
    backgroundColor: string,
    speed: number,
    width: number,
    angle: number,
    barColor: string,
    metadata: Record<string, any>
  ) {
    super(lifespan, backgroundColor, metadata, 'BAR');

    this.speed = speed;
    this.width = width;
    this.angle = angle;
    this.barColor = barColor;
  }
}
