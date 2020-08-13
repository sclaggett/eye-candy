export default class Stimulus {
  // parameters are used for program execution
  // metadata is used for stimulus generation & analysis
  constructor(lifespan, backgroundColor, metadata) {
    this.lifespan = lifespan;
    this.backgroundColor = backgroundColor;
    this.metadata = metadata;
    this.age = 0;
  }
}
