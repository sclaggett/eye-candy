import StimulusBase from './StimulusBase';

export default class Solid extends StimulusBase {
  render(context: CanvasRenderingContext2D) {
    this.renderBackground(context);
    this.frameNumber += 1;
  }
}
