import Stimulus from './Stimulus';

export default class Solid extends Stimulus {
  constructor(
    lifespan: number,
    backgroundColor: string,
    metadata: Record<string, any>
  ) {
    super(lifespan, backgroundColor, metadata, 'SOLID');
  }
}
