import Image from '../types/Image';
import Stimulus from '../types/Stimulus';
import StimulusRenderer from './StimulusRenderer';
import VideoInfo from '../../shared/VideoInfo';

export default class ImageRenderer extends StimulusRenderer {
  image: Image;

  preloadedImage: ImageBitmap;

  constructor(
    stimulus: Stimulus,
    videoInfo: VideoInfo,
    preloadedImages: Map<string, ImageBitmap>
  ) {
    super(stimulus, videoInfo);
    this.image = stimulus as Image;
    const image = preloadedImages.get(this.image.image);
    if (image === undefined) {
      throw new Error(`Image ${this.image.image} not found in preload cache`);
    }
    this.preloadedImage = image;

    console.log(
      `Created Image stimulus which will run for ${stimulus.lifespan} seconds at ${videoInfo.fps} fps for a total of ${this.frameCount} frames`
    );
  }

  render(context: CanvasRenderingContext2D) {
    context.save();
    this.renderBackground(context);

    // TODO: should change so auto fixate at middle of image?
    // would be breaking and require rewriting protocols
    const centerX = context.canvas.width / 2;
    const centerY = context.canvas.height / 2;
    const deltaX = centerX - this.image.fixationPoint.x;
    const deltaY = centerY - this.image.fixationPoint.y;
    let x;
    let y;
    if (typeof this.image.scale === 'number') {
      x = this.preloadedImage.width * this.image.scale;
      y = this.preloadedImage.height * this.image.scale;
    } else {
      // 2-dim array
      x = this.preloadedImage.width * this.image.scale[0];
      y = this.preloadedImage.height * this.image.scale[1];
    }
    context.drawImage(this.preloadedImage, deltaX, deltaY, x, y);

    context.restore();
    context.fillStyle = 'red';
    context.font = '16px Arial';
    context.fillText(`Image ${this.frameNumber}`, 50, 50);
    this.frameNumber += 1;
  }
}
