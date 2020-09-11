import React from 'react';
import * as styles from './StimulusRenderer.css';
import { Stimulus } from '../../common/Stimulus';

const ipc = require('electron').ipcRenderer;

type StimulusRendererProps = {
  dummy: string;
};

type StimulusRendererState = {
  complete: boolean;
  // time: number;
  // frameNumber: number;
  stimulus: Stimulus | null;
  stimulusQueue: Stimulus[];
  // graphics: string[];
};

// The next batch of stimuli will be retrieved from the main process when our queue reaches
// this level.
const STIMULUS_RELOAD_THRESHOLD = 10;

export default class StimulusRenderer extends React.Component<
  StimulusRendererProps,
  StimulusRendererState
> {
  frameNumber: number; // Temp

  constructor(props: StimulusRendererProps) {
    super(props);
    this.state = {
      complete: false,
      // time: 0,
      // frameNumber: 0,
      stimulus: null,
      stimulusQueue: [],
      // graphics: [],
    };
    this.onAnimationFrame = this.onAnimationFrame.bind(this);

    this.frameNumber = 0; // Temp
  }

  /*
   * The componentDidMount() function is invoked when the component is mounted in the
   * DOM and is a good spot to perform class initialization. Retrieve the initial list
   * of stimuli from the main process and queue an animation request for the next frame.
   */
  componentDidMount() {
    this.fetchStimulusBatch();
    requestAnimationFrame(this.onAnimationFrame);
  }

  onAnimationFrame(_timestamp: any) {
    // Queue the animation request for next frame. This is done first, before the
    // front stimulus is popped off the queue, because we want to do a final render
    // on completion
    if (this.state.stimulusQueue.length > 0) {
      requestAnimationFrame(this.onAnimationFrame);
    }

    // Pop the next stimulus off the front of the queue if one exists or clear the
    // state field if not.
    if (this.state.stimulusQueue.length > 0) {
      this.frameNumber += 1;
      if (this.frameNumber % 5) {
        this.setState((prevState) => ({
          stimulus: prevState.stimulusQueue[0],
          stimulusQueue: prevState.stimulusQueue.slice(1),
        }));
      }
    } else {
      this.setState({
        stimulus: null,
      });
    }

    // Fetch the next batch of stimuli if we're getting low
    if (
      this.state.stimulusQueue.length <= STIMULUS_RELOAD_THRESHOLD &&
      !this.state.complete
    ) {
      this.fetchStimulusBatch();
    }
  }

  /*
   * The fetchStimulusBatch() function retrieves the next batch of stimuli from the main
   * process and saves them to the state. It detects the end of the program and sets the
   * corresponding flag in the state.
   */
  fetchStimulusBatch() {
    if (this.state.complete) {
      return;
    }

    // Fetch the raw stimuli as strings. The main process will return an empty array when
    // the program is complete
    const rawStimuli: string[] = ipc.sendSync('getStimulusBatch');
    if (rawStimuli.length === 0) {
      this.setState({
        complete: true,
      });
      return;
    }

    // Parse the JSON strings, cast them as Stimulus objects, and update the state
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
   * The following code could be decomposed into smaller components which might make
   * everything more readable.
   */
  render() {
    if (this.state.stimulus !== null) {
      console.log(`Rendering stimulus: ${this.state.stimulus})`);
    } else if (this.state.complete) {
      console.log('Program complete');
    } else {
      console.log('Error: Starved for stimuli');
    }

    return (
      <div className={styles.container} data-tid="container">
        <div>{JSON.stringify(this.state.stimulus)}</div>
      </div>
    );
  }
}
