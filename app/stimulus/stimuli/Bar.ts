import BarStimulus from '../../common/stimuli/BarStimulus';
import Stimulus from '../../common/stimuli/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../common/VideoInfo';

export default class Bar extends StimulusBase {
  barStimulus: BarStimulus;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);
    this.barStimulus = stimulus as BarStimulus;

    console.log(
      `Created Bar stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    const timeDelta = this.frameNumber * (1 / this.videoInfo.fps);
    const diagonalLength = this.getDiagonalLength(context);

    let position;
    if (this.frameNumber === 0) {
      position = {
        r: diagonalLength / 2,
        theta: -this.barStimulus.angle,
      };
    } else {
      position = {
        r: this.prevPosition.r - this.barStimulus.speed * timeDelta,
        theta: this.prevPosition.theta,
      };
    }

    const x =
      (this.barStimulus.width / 2) * Math.cos(position.theta) +
      position.r * Math.cos(position.theta) +
      context.canvas.clientWidth / 2;
    const y =
      (this.barStimulus.width / 2) * Math.sin(position.theta) +
      position.r * Math.sin(position.theta) +
      context.canvas.clientHeight / 2;

    console.log(
      `Rendering bar, timeDelta = ${timeDelta}, diagonalLength = ${diagonalLength}, position = ${JSON.stringify(
        position
      )}, x = ${x}, y = ${y}`
    );

    /*
    // might need to translate first if rotation
    context.translate(x, y);
    context.fillStyle = this.barStimulus.barColor;
    // Rotate rectangle to be perpendicular with Center of Canvas
    context.rotate(position.theta);
    // Draw a rectangle, adjusting for Bar width
    context.fillRect(Math.round(-this.barStimulus / 2), Math.round(-diagonalLength / 2),
      this.barStimulus.width, diagonalLength);
    */

    this.prevPosition = position;

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`Bar ${this.frameNumber}`, 30, 30);
    this.frameNumber += 1;
  }
}

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

  const diagonalLength = getDiagonalLength();

  if (frameNumber == 0) {
    position = {r: diagonalLength/2, theta: -bar.angle}
  } else {
    position = {r: bar.prevPosition.r - (bar.speed * timeDelta),
            theta: bar.prevPosition.theta}
  }

  x = bar.size.width/2*cos(position.theta) + newPosition.r*cos(position.theta) +
    state["windowWidth"]/2;
  y = bar.size.width/2*sin(position.theta) + newPosition.r*sin(position.theta) +
    state["windowHeight"]/2;

    // might need to translate first if rotation
    context.translate(x, y)
    context.fillStyle = graphic.color
    // Rotate rectangle to be perpendicular with Center of Canvas
    context.rotate(position.theta)
    // Draw a rectangle, adjusting for Bar width
    context.fillRect(Math.round(-bar.size.width/2), Math.round(-diagonalLength/2),
        bar.size.width, diagonalLength)
}
*/
