import BarStimulus from '../../common/stimuli/BarStimulus';
import Stimulus from '../../common/stimuli/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../common/VideoInfo';

export default class Bar extends StimulusBase {
  barStimulus: BarStimulus;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);
    this.barStimulus = stimulus as BarStimulus;
  }

  render(context: CanvasRenderingContext2D) {
    this.frameNumber += 1;
    if (this.frameNumber !== 1) {
      return;
    }

    context.save();
    this.renderBackground(context);

    /*
    const canvasPattern: HTMLCanvasElement = document.createElement('canvas');
    canvasPattern.width = this.checkerboardStimulus.size * 2;
    canvasPattern.height = this.checkerboardStimulus.size * 2;
    const contextPattern: CanvasRenderingContext2D | null = canvasPattern.getContext(
      '2d'
    );
    if (contextPattern === null) {
      throw new Error('Failed to get context');
    }

    contextPattern.fillStyle = this.checkerboardStimulus.alternateColor;
    contextPattern.fillRect(0, 0, canvasPattern.width, canvasPattern.height);

    contextPattern.fillStyle = this.checkerboardStimulus.color;
    contextPattern.fillRect(
      0,
      0,
      this.checkerboardStimulus.size,
      this.checkerboardStimulus.size
    );
    contextPattern.fillRect(
      this.checkerboardStimulus.size,
      this.checkerboardStimulus.size,
      this.checkerboardStimulus.size,
      this.checkerboardStimulus.size
    );

    const pattern: CanvasPattern | null = context.createPattern(
      canvasPattern,
      'repeat'
    );
    if (pattern === null) {
      throw new Error('Failed to create pattern');
    }

    context.fillStyle = pattern;

    const diag = Math.sqrt(
      context.canvas.width ** 2 + context.canvas.height ** 2
    );

    if (this.checkerboardStimulus.angle === 0) {
      context.fillRect(0, 0, diag, diag);
    } else {
      context.translate(context.canvas.width / 2, context.canvas.height / 2);
      context.rotate(-this.checkerboardStimulus.angle);
      context.translate(-diag / 2, -diag / 2);
      context.fillRect(0, 0, diag, diag);
    }
    */

    context.restore();
  }
}

/*
            if (stimulus.age === 0) {
                // console.log("len is 0")
                barDispatcher(stimulus.lifespan, stimulus.width, stimulus.barColor, stimulus.backgroundColor,
                    stimulus.speed, stimulus.angle)
            }

function barDispatcher(lifespan, width, barColor, backgroundColor, speed, angle,
    startR=getDiagonalLength()/2) {

    store.dispatch(addGraphicAC({
        graphicType: GRAPHIC.BAR, age: 0, color: barColor, size: {width: width,
            height: getDiagonalLength()}, speed: speed, angle: angle,
            lifespan: lifespan, startR: startR
    }))
}

function tickBar(state, bar, timeDelta) {
    let newPosition = undefined
    if (bar.position === undefined) {
        newPosition = {r: bar.startR, theta: -bar.angle}
    } else {
        newPosition = {r: bar.position.r - bar.speed*timeDelta,
            theta: bar.position.theta}
    }

    return Object.assign({}, bar, {
        position: newPosition,
        age: bar.age + timeDelta,
        // compensate for bar width & height, translate from polar & translate from center
        // use length on both to make square
        origin: {x: bar.size.width/2*cos(newPosition.theta) +
                    newPosition.r*cos(newPosition.theta) + state["windowWidth"]/2,
                 y: bar.size.width/2*sin(newPosition.theta) +
                    newPosition.r*sin(newPosition.theta) + state["windowHeight"]/2}
    })
}


export function renderBar(context, graphic) {
    // might need to translate first if rotation
    context.translate(graphic.origin.x,
        graphic.origin.y)
    context.fillStyle = graphic.color
    // Rotate rectangle to be perpendicular with Center of Canvas
    context.rotate(graphic.position.theta)
    // Draw a rectangle, adjusting for Bar width
    context.fillRect(Math.round(-graphic.size.width/2), Math.round(-graphic.size.height/2),
        graphic.size.width, graphic.size.height)
}
*/
