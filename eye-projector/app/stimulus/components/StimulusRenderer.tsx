import { ipcRenderer } from 'electron';
import fs from 'fs';
import path from 'path';
import React from 'react';
import RendererFactory from '../../stimuli/renderers/RendererFactory';
import Stimulus from '../../stimuli/types/Stimulus';
import StimulusBaseRenderer from '../../stimuli/renderers/StimulusRenderer';
import VideoInfo from '../../shared/VideoInfo';
import * as styles from './StimulusRenderer.css';

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
  preloadImagePaths: Set<string>;

  // Map between the image paths on disk and the corresponding preloaded bitmaps
  preloadedImages: Map<string, ImageBitmap>;

  // A flag that indicates when preloading is complete
  preloadComplete: boolean;

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

    this.preloadImagePaths = new Set();
    this.preloadedImages = new Map();
    this.preloadComplete = false;

    this.onAnimationFrame = this.onAnimationFrame.bind(this);

    this.canvasRef = React.createRef<HTMLCanvasElement>();
  }

  /*
   * The componentDidMount() function is invoked when the component is mounted in the
   * DOM and is a good spot to perform class initialization. Initialize the program
   * that we're about to run, fetch the initial list of stimuli from the main process,
   * and queue an animation request so onAnimationFrame() will be called before the
   * next frame is rendered.
   */
  componentDidMount() {
    this.initializeProgram();
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
      ipcRenderer.send('startStimuli', this.state.frameCount + PRE_FRAME_COUNT);
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
          this.state.videoInfo,
          this.preloadedImages
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
   * The initializeProgram() function retrieves details from the main thread regarding
   * the video we're simulating and preloads all images needed by the program.
   */
  initializeProgram() {
    // Fetch video info
    const videoInfo = JSON.parse(
      ipcRenderer.sendSync('getVideoInfo')
    ) as VideoInfo;
    this.setState({
      videoInfo,
    });

    // Fetch the image list from the main process and stop here if there are no images
    this.preloadImagePaths = ipcRenderer.sendSync('getImageSet') as Set<string>;
    if (this.preloadImagePaths.size === 0) {
      this.preloadComplete = true;
      return;
    }

    this.preloadImagePaths.forEach((imagePath) => {
      // Combine any relative paths with the output directory
      let fullImagePath: string;
      if (path.isAbsolute(imagePath)) {
        fullImagePath = imagePath;
      } else {
        fullImagePath = path.join(videoInfo.rootDirectory, imagePath);
      }
      fs.readFile(fullImagePath, (err, data: Buffer) => {
        if (err) {
          ipcRenderer.send(
            'programFailure',
            `Failed to open image '${imagePath}': ${err}`
          );
        }
        createImageBitmap(new Blob([data]))
          .then((image: ImageBitmap) => {
            this.preloadedImages.set(imagePath, image);
            if (this.preloadedImages.size === this.preloadImagePaths.size) {
              this.preloadComplete = true;
            }
            return null;
          })
          .catch((e) => {
            ipcRenderer.send(
              'programFailure',
              `Failed to parse image '${imagePath}': ${e}`
            );
          });
      });
    });
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
    const rawStimuli: string[] = ipcRenderer.sendSync('getStimulusBatch');
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
