import { ipcRenderer, IpcRendererEvent } from 'electron';
import React from 'react';
import * as styles from './Control.css';

// Require the eye-native library but remember that we can't use it in a renderer
// process until the main process notifies us of the module root
const eyeNative = require('eye-native');

type ControlProps = {
  dummy: string;
};

type ControlState = {
  // Flag that indicates if we're running, if a signal has been detected, and the
  // average latency in millseconds
  running: boolean;
  signalDetected: boolean;
  avgLatencyMs: number;
};

export default class Control extends React.Component<
  ControlProps,
  ControlState
> {
  constructor(props: ControlProps) {
    super(props);

    // Define the initial state
    this.state = {
      running: false,
      signalDetected: false,
      avgLatencyMs: 0,
    };

    // Bind the IPC handlers and other callbacks so "this" will be defined when
    // they are invoked
    this.onStartButtonClick = this.onStartButtonClick.bind(this);
    this.onStopButtonClick = this.onStopButtonClick.bind(this);
    this.onSignalUpdate = this.onSignalUpdate.bind(this);
    this.onRunStopped = this.onRunStopped.bind(this);

    // Listen for IPC calls
    ipcRenderer.on('signalUpdate', this.onSignalUpdate);
    ipcRenderer.on('runStopped', this.onRunStopped);
  }

  /*
   * The following two functions will be invoked when the user clicks the Start or Stop
   * buttons. In both cases, the signals will be passed to the main process.
   */
  onStartButtonClick(event: React.MouseEvent<HTMLInputElement, MouseEvent>) {
    ipcRenderer.send('startRun');
    this.setState({
      running: true,
    });
  }

  onStopButtonClick() {
    ipcRenderer.send('stopRun');
  }

  /*
   * The onSignalUpdate() function will be invoked by the main process at regular intervals as
   * it checks for the presence of a signal and calculates the average latency in milliseconds.
   */
  onSignalUpdate(
    _event: IpcRendererEvent,
    signalDetected: boolean,
    avgLatencyMs: number
  ) {
    this.setState({
      signalDetected,
      avgLatencyMs,
    });
  }

  /*
   * The onRunStopped() function will be invoked by the main process when the run has
   * stopped due to completion or failure.
   */
  onRunStopped(_event: IpcRendererEvent) {
    this.setState({
      running: false,
    });
  }

  /*
   * The render() function converts the state into a JSX description of the interface
   * that should be displayed and the framework will update the output as necessary.
   */
  render() {
    let statusText;
    let statusStyle;
    if (!this.state.running) {
      statusText = 'Not running';
      statusStyle = styles.statusNotRunning;
    } else if (!this.state.signalDetected) {
      statusText = 'No signal detected';
      statusStyle = styles.statusNoSignal;
    } else {
      statusText = `Average latency: ${this.state.avgLatencyMs} ms`;
      statusStyle = styles.statusSignal;
    }

    return (
      <div className={styles.container}>
        <div className={styles.row}>
          <div className={styles.instructions}>
            <strong>1.&nbsp;</strong>
            Arrange the EyeCandy system as shown below, with the projector
            pointing towards a photodetector, and the photodetector connected to
            the timing card&apos;s external event input. Start with the
            photodetector gain turned all the way down.
          </div>
        </div>
        <div className={styles.measurementSetup} />
        <div className={styles.rows}>
          <div className={styles.instructions}>
            <strong>2.&nbsp;</strong>
            Click&nbsp;
            <input
              className={styles.button}
              type="button"
              value="Start"
              disabled={this.state.running}
              onClick={this.onStartButtonClick}
            />
            &nbsp;to begin the calibration process.
          </div>
        </div>
        <div className={styles.rows}>
          <div className={styles.instructions}>
            <strong>3.&nbsp;</strong>
            Slowly increase the gain on the photodetector until the signal is
            detected. The average system latency will be displayed below.
          </div>
        </div>
        <div className={styles.rows}>
          <div className={statusStyle}>{statusText}</div>
        </div>
        <div className={styles.rows}>
          <div className={styles.instructions}>
            <strong>4.&nbsp;</strong>
            Click&nbsp;
            <input
              className={styles.button}
              type="button"
              value="Stop"
              disabled={!this.state.running}
              onClick={this.onStopButtonClick}
            />
            &nbsp;to end the calibration process.
          </div>
        </div>
      </div>
    );
  }
}
