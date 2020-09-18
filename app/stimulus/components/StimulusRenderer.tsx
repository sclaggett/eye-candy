import React from 'react';
import * as styles from './StimulusRenderer.css';
import Stimulus from '../../common/stimuli/Stimulus';
import StimulusBase from '../stimuli/StimulusBase';
import StimulusFactory from '../stimuli/StimulusFactory';
import VideoInfo from '../../common/VideoInfo';

const ipc = require('electron').ipcRenderer;

type StimulusRendererProps = {
  dummy: string;
};

/*
 * This component's lifecycle consists of three stages:
 *  1. Starting: For frames 1 and 2, the component hasn't fully initialized the stimulus
 *     queue. Also, for frame 1, the component doesn't have a reference to the canvas
 *     element yet. These first two frames need to be discarded by the encoder.
 *  2. Running: Stimuli are being rendered to the browser window at exactly one stimulus
 *     per frame.
 *  3. Complete: The program is complete and no more stimuli exist to be rendered.
 */
enum LifecycleStage {
  STARTING,
  RUNNING,
  COMPLETE,
}

type StimulusRendererState = {
  lifecycleStage: LifecycleStage;
  videoInfo: VideoInfo | null;
  stimulus: StimulusBase | null;
  stimulusQueue: Stimulus[];
};

// The next batch of stimuli will be retrieved from the main process when our queue reaches
// this level.
const STIMULUS_RELOAD_THRESHOLD = 10;

export default class StimulusRenderer extends React.Component<
  StimulusRendererProps,
  StimulusRendererState
> {
  canvasRef: React.RefObject<HTMLCanvasElement>;

  frameCount: number; // Temp

  constructor(props: StimulusRendererProps) {
    super(props);

    this.state = {
      lifecycleStage: LifecycleStage.STARTING,
      videoInfo: null,
      stimulus: null,
      stimulusQueue: [],
    };

    this.onAnimationFrame = this.onAnimationFrame.bind(this);

    this.canvasRef = React.createRef<HTMLCanvasElement>();

    this.frameCount = 0; // Temp
  }

  /*
   * The componentDidMount() function is invoked when the component is mounted in the
   * DOM and is a good spot to perform class initialization. Retrieve the video
   * inforation and the initial list of stimuli from the main process and queue an
   * animation request so onAnimationFrame() will be called before the next frame
   * is rendered.
   */
  componentDidMount() {
    this.fetchVideoInfo();
    this.fetchStimulusBatch();
    requestAnimationFrame(this.onAnimationFrame);
  }

  /*
   * The onAnimationFrame() function is invoked by the browser before it renders the next
   * frame. It's the mechanism to use because we want to display one stimulus per frame
   * without having to worry about the number of frames per second that the browser is
   * running at. Copy the next stimulus from the queue to the state which will trigger a
   * call to render().
   */
  onAnimationFrame(_timestamp: number) {
    // Detect the lifecycle change from starting to running based on whether we have a
    // canvas reference or not, which in turn influences whether the render() function will
    // show the canvas or not.
    if (
      this.canvasRef.current !== null &&
      this.state.lifecycleStage === LifecycleStage.STARTING
    ) {
      this.setState({
        lifecycleStage: LifecycleStage.RUNNING,
      });
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
        console.log(`Creating stimulus: ${JSON.stringify(currentStimulus)}`);
        currentStimulus = StimulusFactory.createStimulus(
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

    // Queue the animation request for next frame so this function will be invoked again.
    requestAnimationFrame(this.onAnimationFrame);
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
    // Render a blank output if we're out of stimuli and the program is complete and
    // throw an error if we end up starved for stimuli.
    if (this.state.stimulus === null) {
      if (this.state.lifecycleStage !== LifecycleStage.RUNNING) {
        return <div className={styles.containerStopped} />;
      }
      throw new Error('Render loop starved for stimuli');
    }

    return (
      <div className={styles.containerRunning}>
        <canvas ref={this.canvasRef} className={styles.stimulationCanvas} />
      </div>
    );
  }
}
