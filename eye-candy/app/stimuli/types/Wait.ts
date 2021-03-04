import Stimulus from './Stimulus';

export default class Wait extends Stimulus {
  constructor(lifespan: number, metadata: Record<string, any>) {
    super(lifespan, 'black', metadata, 'WAIT');
  }
}
