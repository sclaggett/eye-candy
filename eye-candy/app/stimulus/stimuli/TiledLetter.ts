import Stimulus from '../../shared/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../shared/VideoInfo';

export default class TiledLetter extends StimulusBase {
  backgroundColor: string;

  letter: string;

  size: number;

  padding: number;

  color: string;

  angle: number;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);

    this.backgroundColor = stimulus.backgroundColor;
    this.letter = stimulus.letter;
    this.size = stimulus.size;
    this.padding = stimulus.padding;
    this.color = stimulus.color;
    this.angle = stimulus.angle;

    console.log(
      `Created TiledLetter stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    /*
    var canvasPattern = document.createElement("canvas");
    canvasPattern.width = this.size + this.padding;
    canvasPattern.height = this.size + this.padding;
    var contextPattern = canvasPattern.getContext("2d");

    contextPattern.fillStyle = this.backgroundColor;
    contextPattern.fillRect(0, 0, canvasPattern.width, canvasPattern.height);

    contextPattern.fillStyle = this.color;
    contextPattern.font = this.size + 'px Sloan';
    contextPattern.fillText(this.letter, this.padding / 2, this.padding / 2 + this.size);

    var pattern = context.createPattern(canvasPattern, "repeat");

    store.dispatch(addGraphicAC({
        graphicType: GRAPHIC.PATTERN,
        pattern: pattern,
        angle: angle,
        lifespan: lifespan,
        age: 0
    }))

export function renderPattern(context, pattern,angle) {
    context.fillStyle = pattern;
    const diag = getDiagonalLength()
    if (angle===0) {
        context.fillRect(0,0, diag, diag);
    } else  {
        context.translate(WIDTH/2,HEIGHT/2)
        context.rotate(-angle)
        context.translate(-diag/2,-diag/2)
        context.fillRect(0,0, diag, diag);
    }

}
*/
    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`TiledLetter ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
