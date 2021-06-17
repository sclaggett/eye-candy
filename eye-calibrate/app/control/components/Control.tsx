import { ipcRenderer, IpcRendererEvent, nativeImage } from 'electron';
import Modal from 'react-modal';
import React from 'react';
import { ReOrderableItem, ReOrderableList } from 'react-reorderable-list';
import { ListGroup } from 'react-bootstrap';
import fs from 'fs';
import path from 'path';
import ProjectorInfo from '../../shared/ProjectorInfo';
import StartRun from '../../shared/StartRun';
import * as styles from './Control.css';

// Require the eye-native library but remember that we can't use it in a renderer
// process until the main process notifies us of the module root
const eyeNative = require('eye-native');

// The starting fragment of the default root filename for all runs
const defaultRootFilename = 'Run';

// Give the modal library the name of this app's root div
const rootDiv = document.getElementById('controlRoot');
Modal.setAppElement('#controlRoot');

type ControlProps = {
  dummy: string;
};

type ControlState = {
  // Flag that indicates if we're running and the current status
  running: boolean;
  status: string;
};

export default class Control extends React.Component<
  ControlProps,
  ControlState
> {
  metadataTextArea: React.RefObject<HTMLTextAreaElement>;

  logTextArea: React.RefObject<HTMLTextAreaElement>;

  previewContainer: React.RefObject<HTMLDivElement>;

  previewInterval: ReturnType<typeof setInterval> | null;

  constructor(props: ControlProps) {
    super(props);

    // Set the initial FFmpeg path based on the operating system
    let initFfmpegPath = '';
    if (process.platform === 'win32') {
      initFfmpegPath = 'C:\\ffmpeg\\bin\\ffmpeg.exe';
    } else {
      initFfmpegPath = '/usr/local/bin/ffmpeg';
    }

    // Define the initial state
    this.state = {
      running: false,
      status: 'Not running',
    };

    // Bind the IPC handlers and other callbacks so "this" will be defined when
    // they are invoked
    this.onStartButtonClick = this.onStartButtonClick.bind(this);
    this.onStopButtonClick = this.onStopButtonClick.bind(this);
    this.onRunStopped = this.onRunStopped.bind(this);

    // Listen for IPC calls
    ipcRenderer.on('runStopped', this.onRunStopped);

    /*
    this.onTextInputChange = this.onTextInputChange.bind(this);
    this.onNumberInputChange = this.onNumberInputChange.bind(this);
    this.onCheckboxChange = this.onCheckboxChange.bind(this);
    this.onTextAreaChange = this.onTextAreaChange.bind(this);
    this.onVideoListUpdate = this.onVideoListUpdate.bind(this);
    this.onAddVideo = this.onAddVideo.bind(this);
    this.onRemoveVideo = this.onRemoveVideo.bind(this);
    this.onProjectorRefresh = this.onProjectorRefresh.bind(this);
    this.onLog = this.onLog.bind(this);
    this.onDisplayChange = this.onDisplayChange.bind(this);
    this.onRunPreviewChannel = this.onRunPreviewChannel.bind(this);
    this.onPreviewInterval = this.onPreviewInterval.bind(this);
    this.onPlaybackDuration = this.onPlaybackDuration.bind(this);
    this.onPlaybackPosition = this.onPlaybackPosition.bind(this);
    this.onPlaybackDelay = this.onPlaybackDelay.bind(this);
    this.onDirectorySelectClick = this.onDirectorySelectClick.bind(this);
    this.onFfmpegSelectClick = this.onFfmpegSelectClick.bind(this);
    this.onToggleSettingsDialog = this.onToggleSettingsDialog.bind(this);

    // Listen for IPC calls
    ipcRenderer.on('log', this.onLog);
    ipcRenderer.on('displayChange', this.onDisplayChange);
    ipcRenderer.on('runPreviewChannel', this.onRunPreviewChannel);
    ipcRenderer.on('playbackDuration', this.onPlaybackDuration);
    ipcRenderer.on('playbackPosition', this.onPlaybackPosition);
    ipcRenderer.on('playbackDelay', this.onPlaybackDelay);
    */
  }

  /*
   * The following two functions will be invoked when the user clicks the Start or Stop
   * buttons. In both cases, the signals will be passed to the main process.
   */
  onStartButtonClick(event: React.MouseEvent<HTMLInputElement, MouseEvent>) {
    console.log(`## Start`);
    ipcRenderer.send('startRun');
    this.setState({
      running: true,
    });
  }

  onStopButtonClick() {
    console.log(`## Stop`);
    ipcRenderer.send('stopRun');
  }

  /*
   * The onRunStopped() function will be invoked by the main process when the run has
   * stopped due to completion or failure.
   */
  onRunStopped(_event: IpcRendererEvent) {
    this.setState({
      running: true,
    });
  }

  /*
   * The render() function converts the state into a JSX description of the interface
   * that should be displayed and the framework will update the output as necessary.
   */
  render() {
    return (
      <div className={styles.container}>
        <div className={styles.row}>
          <div className={styles.instructions}>
            <strong>1. </strong>
            Arrange the EyeCandy system as shown below, with the projector
            pointing towards a photodetector, and the photodetector connected to
            the timing card&apos;s external event input. Start with the
            photodetector gain turned all the way down.
          </div>
        </div>
        <div className={styles.measurementSetup} />
        <div className={styles.rows}>
          <div className={styles.instructions}>
            <strong>2. </strong>
            Click
            <input
              className={styles.button}
              type="button"
              value="Start"
              disabled={this.state.running}
              onClick={this.onStartButtonClick}
            />
            to begin the calibration process.
          </div>
        </div>
        <div className={styles.rows}>
          <div className={styles.instructions}>
            <strong>3. </strong>
            Slowly increase the gain on the photodetector until the signal is
            detected. The average system latency will be displayed below.
          </div>
        </div>
        <div className={styles.rows}>
          <div className={styles.status}>{this.state.status}</div>
        </div>
        <div className={styles.rows}>
          <div className={styles.instructions}>
            <strong>4. </strong>
            Click
            <input
              className={styles.button}
              type="button"
              value="Stop"
              disabled={!this.state.running}
              onClick={this.onStopButtonClick}
            />
            to end the calibration process.
          </div>
        </div>
      </div>
    );
  }
}
