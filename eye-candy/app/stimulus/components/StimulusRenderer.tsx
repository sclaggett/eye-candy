import React from 'react';
import Stimulus from '../../stimuli/types/Stimulus';
import StimulusBaseRenderer from '../../stimuli/renderers/StimulusRenderer';
import RendererFactory from '../../stimuli/renderers/RendererFactory';
import VideoInfo from '../../shared/VideoInfo';
import * as styles from './StimulusRenderer.css';

const ipc = require('electron').ipcRenderer;

type StimulusRendererProps = {
  dummy: string;
};

/*
 * This component's lifecycle consists of three stages:
 *  1. Starting: The state where we're initializing the stimulus list and preloading
 *     images. This also covers the frame or two it takes for the component to get a
 *     reference to the canvas element. These frames need to be discarded by the encoder.
 *  2. Running: Stimuli are being rendered to the browser window at exactly one stimulus
 *     tick per frame.
 *  3. Complete: The program is complete and no more stimuli exist to be rendered.
 */
enum LifecycleStage {
  STARTING,
  RUNNING,
  COMPLETE,
}

// Experimentation has shown that we need to discard two additional frames beyond
// the first frame number that we measure. It's not clear why this is--perhaps a
// result of how the React framework boots, or maybe the result of off-by-one errors
// in our counting logic.
const PRE_FRAME_COUNT = 2;

type StimulusRendererState = {
  frameCount: number;
  lifecycleStage: LifecycleStage;
  videoInfo: VideoInfo | null;
  stimulus: StimulusBaseRenderer | null;
  stimulusQueue: Stimulus[];
};

// The next batch of stimuli will be retrieved from the main process when our
// queue reaches this level.
const STIMULUS_RELOAD_THRESHOLD = 25;

export default class StimulusRenderer extends React.Component<
  StimulusRendererProps,
  StimulusRendererState
> {
  // Set of image paths from the main process that need to be preloaded before the run
  // can start
  preloadImageSet: Set<string>;

  // Number of images that are preloading, have been preloaded
  imagesPreloading: number;

  imagesPreloaded: number;

  // A flag that indicates when preloading is complete and a map between the image paths
  // on disk and the corresponding preloaded internal URLs
  preloadComplete: boolean;

  preloadedImages: Record<string, string>;

  // Reference to the canvas where the stimuli will be drawn
  canvasRef: React.RefObject<HTMLCanvasElement>;

  constructor(props: StimulusRendererProps) {
    super(props);

    this.state = {
      frameCount: 0,
      lifecycleStage: LifecycleStage.STARTING,
      videoInfo: null,
      stimulus: null,
      stimulusQueue: [],
    };

    this.preloadImageSet = new Set();
    this.imagesPreloading = 0;
    this.imagesPreloaded = 0;
    this.preloadComplete = false;
    this.preloadedImages = {};

    this.onAnimationFrame = this.onAnimationFrame.bind(this);

    this.canvasRef = React.createRef<HTMLCanvasElement>();
  }

  /*
   * The componentDidMount() function is invoked when the component is mounted in the
   * DOM and is a good spot to perform class initialization. Retrieve the video
   * inforation, a list of images that need to be preloaded, and the initial list of
   * stimuli from the main process and queue an animation request so onAnimationFrame()
   * will be called before the next frame is rendered.
   */
  componentDidMount() {
    this.fetchVideoInfo();
    this.fetchImageSet();
    this.fetchStimulusBatch();
    requestAnimationFrame(this.onAnimationFrame);
  }

  /*
   * The onAnimationFrame() function is invoked by the browser before it renders the next
   * frame. It's the mechanism to use because we want to display one stimulus tick per
   * frame without having to worry about the number of frames per second that the browser
   * is running at. Copy the next stimulus from the queue to the state which will trigger a
   * call to render().
   */
  onAnimationFrame(_timestamp: number) {
    // Start by incrementing the frame count to make sure the render() function will be
    // called even if no stimuli are available. Also queue a request for this function
    // to be called again on the next frame.
    this.setState((prevState) => ({
      frameCount: prevState.frameCount + 1,
    }));
    requestAnimationFrame(this.onAnimationFrame);

    // Detect the lifecycle change from starting to running based on whether all images
    // have been preloaded and we have a canvas reference or not. The lifecycle stage in
    // turn influences whether the render() function will show the canvas or not.
    if (
      this.preloadComplete &&
      this.canvasRef.current !== null &&
      this.state.lifecycleStage === LifecycleStage.STARTING
    ) {
      this.setState({
        lifecycleStage: LifecycleStage.RUNNING,
      });
      ipc.send('startStimuli', this.state.frameCount + PRE_FRAME_COUNT);
    }

    // Stop here if we're still starting.
    if (this.state.lifecycleStage === LifecycleStage.STARTING) {
      return;
    }

    // Advance to the next stimulus if the current one has no more frames left to render.
    // Note that we use a local variable to keep track of the current stimulus because the
    // setState() call is asynchronous.
    let currentStimulus = this.state.stimulus;
    if (currentStimulus === null || !currentStimulus.hasFrames()) {
      if (this.state.stimulusQueue.length > 0) {
        if (this.state.videoInfo === null) {
          throw new Error('Video info missing');
        }
        console.log(
          `Creating stimulus: ${JSON.stringify(this.state.stimulusQueue[0])}`
        );
        currentStimulus = RendererFactory.createRenderer(
          this.state.stimulusQueue[0],
          this.state.videoInfo
        );
        this.setState((prevState) => ({
          stimulus: currentStimulus,
          stimulusQueue: prevState.stimulusQueue.slice(1),
        }));
      } else {
        currentStimulus = null;
        this.setState({
          stimulus: null,
        });
        ipc.send('endProgram');
        return;
      }
    }

    // Allow the current stimulus to render to the canvas.
    if (
      this.canvasRef !== null &&
      this.canvasRef.current !== null &&
      currentStimulus !== null
    ) {
      const context: CanvasRenderingContext2D | null = this.canvasRef.current.getContext(
        '2d'
      );
      if (context != null) {
        currentStimulus.render(context);
      }
    }

    // Fetch the next batch of stimuli if we're getting low.
    if (
      this.state.stimulusQueue.length <= STIMULUS_RELOAD_THRESHOLD &&
      this.state.lifecycleStage !== LifecycleStage.COMPLETE
    ) {
      this.fetchStimulusBatch();
    }
  }

  /*
   * The fetchVideoInfo() function retrieves details regarding the video we're simulating
   * frames for like dimensions and frames per second.
   */
  fetchVideoInfo() {
    this.setState({
      videoInfo: JSON.parse(ipc.sendSync('getVideoInfo')) as VideoInfo,
    });
  }

  /*
   * The fetchImageSet() function retrieves a list of all images associated with this
   * program so they can be preloaded. It then triggers the preloading process by
   * calling the function preloadImages().
   */
  fetchImageSet() {
    this.preloadImageSet = ipc.sendSync('getImageSet') as Set<string>;
    this.preloadImages();
  }

  preloadImages() {
    console.log(
      `## Preloading image set of size: ${this.preloadImageSet.size}`
    );
    // setTimeout(() => {
    console.log(`## Pretending images have been preloaded`);
    this.preloadComplete = true;
    // }, 3000);

    /*
    //const imageSetStr = [...imageSet].join(',');
    // Set of image paths from the main process that need to be preloaded before the run
    // can start
    imageSet: Set<string>;

    // Map of image paths on disk to URLs internal to the browser
    images: Record<string, string>;

    // Number of images that are loading, have been loaded, and a flag to indicate loading
    // is complete
    imagesLoading = 0;
    imagesLoaded = 0;
    preloadComplete = false;
    */
  }

  /*
   * The fetchStimulusBatch() function retrieves the next batch of stimuli from the main
   * process and saves them to the state. It detects the end of the program and sets the
   * corresponding flag in the state.
   */
  fetchStimulusBatch() {
    // Ignore this call if the program is done running.
    if (this.state.lifecycleStage === LifecycleStage.COMPLETE) {
      return;
    }

    // Fetch the raw stimuli as strings. The main process will return an empty array when
    // the program is complete
    const rawStimuli: string[] = ipc.sendSync('getStimulusBatch');
    if (rawStimuli.length === 0) {
      this.setState({
        lifecycleStage: LifecycleStage.COMPLETE,
      });
      return;
    }

    // Parse the JSON strings, cast them as Stimulus objects, and update the state.
    const parsedStimuli: Stimulus[] = [];
    for (let i = 0; i < rawStimuli.length; i += 1) {
      parsedStimuli.push(JSON.parse(rawStimuli[i]) as Stimulus);
    }

    this.setState((prevState) => ({
      stimulusQueue: [...prevState.stimulusQueue, ...parsedStimuli],
    }));
  }

  /*
   * The render() function converts the state into a JSX description of the interface
   * that should be displayed and the framework will update the output as necessary.
   */
  render() {
    // Render a blank output before and after the program runs, meaning either
    // (1) we're still preloading or (2) we're out of stimuli and the program
    // is complete. This blank output contains the current frame number because
    // we need to generate a unique frame every time in order to keep data flowing
    // to the main process.
    if (
      !this.preloadComplete ||
      (this.state.stimulus === null &&
        this.state.lifecycleStage === LifecycleStage.COMPLETE)
    ) {
      return (
        <div className={styles.containerStopped}>{this.state.frameCount}</div>
      );
    }

    // We're either rendering stimuli or we're waiting on the canvas reference to
    // become valid so we can start. Create the canvas with the appropriate size.
    let width = 0;
    let height = 0;
    if (this.state.videoInfo !== null) {
      width = this.state.videoInfo.width;
      height = this.state.videoInfo.height;
    }
    return (
      <div className={styles.containerRunning}>
        <canvas ref={this.canvasRef} width={width} height={height} />
      </div>
    );
  }
}
