export default class Stimulus {
  age: number;

  backgroundColor: string;

  lifespan: number;

  // metadata is used for stimulus generation & analysis
  metadata: Record<string, string>;

  stimulusType: string;

  constructor(
    lifespan: number,
    backgroundColor: string,
    metadata: Record<string, string>,
    stimulusType: string
  ) {
    this.age = 0;
    this.backgroundColor = backgroundColor;
    this.lifespan = lifespan;
    this.metadata = metadata;
    this.stimulusType = stimulusType;
  }
}
