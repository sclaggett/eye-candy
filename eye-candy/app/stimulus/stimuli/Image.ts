import Image from '../../shared/stimuli/Image';
import Stimulus from '../../shared/stimuli/Stimulus';
import StimulusBase from './StimulusBase';
import VideoInfo from '../../shared/VideoInfo';

export default class Image extends StimulusBase {
  image: Image;

  constructor(stimulus: Stimulus, videoInfo: VideoInfo) {
    super(stimulus, videoInfo);
    this.image = stimulus as Image;
    /*
    console.log(
      `Created Image stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
    */

    console.log(
      `## Image = ${this.image.image}, fixationPoint = ${JSON.stringify(
        this.image.fixationPoint
      )}, scale = ${JSON.stringify(this.image.scale)}`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    /*
function imageDispatcher(lifespan, backgroundColor, image,
                         fixationPoint, scale) {
    // let img = new Image()
    // deleting onload messes up image src on server if the path is not
    // available for example or if image simply hasn't loaded yet
    // img.onload = (event) => {
    //     if (fixationPoint===undefined) {
    //         fixationPoint = {x: img.width / 2, y: img.height / 2}
    //     }
    //     store.dispatch(setGraphicsAC([{
    //             graphicType: GRAPHIC.IMAGE,
    //             image: img,
    //             fixationPoint: fixationPoint,
    //             scale: scale,
    //             lifespan: lifespan,
    //             age: 0
    //     }]))
    // }
    // if (typeof(image)==="string") {
    //     // assume image src (get from server)
    //     img.src = image
    // } else {
    //     // TODO can this be deleted? Or maybe used for older letter rendering?
    //     img = image
    // }

    if (fixationPoint===undefined) {
        // race condition?
        fixationPoint = {x: img.width / 2, y: img.height / 2}
    }

    store.dispatch(setGraphicsAC([{
            graphicType: GRAPHIC.IMAGE,
            image: image,
            fixationPoint: fixationPoint,
            scale: scale,
            lifespan: lifespan,
            age: 0
    }]))
}

export function renderImage(context, image, fixationPoint, scale) {
    // TODO: should change so auto fixate at middle of image?
    // would be breaking and require rewriting protocols
    const centerX = WIDTH/2
    const centerY = HEIGHT/2
    // console.log("renderImage image, fixationPoint:", image, fixationPoint)
    const deltaX = centerX - fixationPoint.x
    const deltaY = centerY - fixationPoint.y
    let X,Y
    if (typeof(scale)=="number") {
        X = image.width*scale
        Y = image.height*scale
    } else {
        // 2-dim array
        X = image.width*scale[0]
        Y = image.height*scale[1]
    }
    // console.log("renderImage", image)
    context.drawImage(image, deltaX, deltaY, X, Y)
}
*/

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`Image ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
