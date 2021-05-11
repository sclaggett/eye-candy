import Stimulus from './Stimulus';

type FixationPoint = {
  x: number;
  y: number;
};

export default class Image extends Stimulus {
  image: string;

  fixationPoint: FixationPoint;

  scale: number[];

  constructor(
    lifespan: number,
    backgroundColor: string,
    image: string,
    fixationPoint: FixationPoint,
    scale: number[],
    metadata: Record<string, any>
  ) {
    super(lifespan, backgroundColor, metadata, 'IMAGE');

    // image can be a number (index) for client-side `renders` object that is
    // stored in indexedDB
    this.image = image;

    // e.g. {x: 0, y: 0}
    this.fixationPoint = fixationPoint;

    // e.g. 1 for normal, or 2 for 2x height and 2x width or [1,2] to scale
    // only width by 2x
    this.scale = scale;
  }
}
