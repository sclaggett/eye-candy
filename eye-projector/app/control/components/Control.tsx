import { ipcRenderer, IpcRendererEvent, nativeImage } from 'electron';
import Modal from 'react-modal';
import React from 'react';
import { ReOrderableItem, ReOrderableList } from 'react-reorderable-list';
import { ListGroup } from 'react-bootstrap';
import * as styles from './Control.css';

// Require the eye-native library but remember that we can't use it in a renderer
// process until the main process notifies us of the module root
const eyeNative = require('eye-native');

// Give the modal library the name of this app's root div
const rootDiv = document.getElementById('controlRoot');
Modal.setAppElement('#controlRoot');

type ControlProps = {
  dummy: string;
};

type ControlState = {
  // The output name is generate from the root directory, the current date, and any
  // existing experiment files
  outputName: string;

  // These fields are initialized from the user settings and can be changed
  // using the settings dialog
  rootDirectory: string;
  ffmpegPath: string;
  projectorLatency: number;
  scaleToFit: boolean;

  // List of video in the order they will be played, each with "id" and "path" fields
  videos: string[];

  // User-defined metadata that describes the experiment
  metadata: string;

  // Projector information relayed to us by the main process
  projDetected: boolean;
  projWidth: number;
  projHeight: number;
  projMaxFps: number;

  // Playback frame rate
  fps: number;

  // Log messages
  log: string;

  // Flag that indicates if we're running and the percent complete
  running: boolean;
  progress: number;

  // Preview image URL and position
  imageUrl: string;
  imageTop: number;
  imageLeft: number;
  imageWidth: number;
  imageHeight: number;

  // Flag indicating if the settings dialog is open
  settingsOpen: boolean;
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
      outputName: '',
      rootDirectory: '',
      ffmpegPath: initFfmpegPath,
      projectorLatency: 0,
      scaleToFit: false,
      videos: [],
      metadata: '',
      projDetected: false,
      projWidth: 0,
      projHeight: 0,
      projMaxFps: 0,
      fps: 30,
      log: '',
      running: false,
      progress: 0,
      imageUrl: '',
      imageTop: 0,
      imageLeft: 0,
      imageWidth: 0,
      imageHeight: 0,
      settingsOpen: false,
    };

    // Initialize variables
    this.metadataTextArea = React.createRef();
    this.logTextArea = React.createRef();
    this.previewContainer = React.createRef();
    this.previewInterval = null;

    // Bind the IPC handlers and other callbacks so "this" will be defined when
    // they are invoked
    this.onInputChange = this.onInputChange.bind(this);
    this.onCheckboxChange = this.onCheckboxChange.bind(this);
    this.onTextAreaChange = this.onTextAreaChange.bind(this);
    this.onVideoListUpdate = this.onVideoListUpdate.bind(this);
    this.onAddVideo = this.onAddVideo.bind(this);
    this.onRemoveVideo = this.onRemoveVideo.bind(this);
    this.onProjectorRefresh = this.onProjectorRefresh.bind(this);
    this.onStartButtonClick = this.onStartButtonClick.bind(this);
    this.onStopButtonClick = this.onStopButtonClick.bind(this);
    this.onLog = this.onLog.bind(this);
    this.onRunPreviewChannel = this.onRunPreviewChannel.bind(this);
    this.onPreviewInterval = this.onPreviewInterval.bind(this);
    this.onRunProgress = this.onRunProgress.bind(this);
    this.onRunStopped = this.onRunStopped.bind(this);
    this.onDirectorySelectClick = this.onDirectorySelectClick.bind(this);
    this.onFfmpegSelectClick = this.onFfmpegSelectClick.bind(this);
    this.onToggleSettingsDialog = this.onToggleSettingsDialog.bind(this);

    // Listen for IPC calls
    ipcRenderer.on('log', this.onLog);
    ipcRenderer.on('runPreviewChannel', this.onRunPreviewChannel);
    ipcRenderer.on('runProgress', this.onRunProgress);
    ipcRenderer.on('runStopped', this.onRunStopped);
  }

  /*
   * The componentDidMount() function is invoked when the component is mounted in the
   * DOM and is a good spot to perform class initialization. Get the user's home
   * directory from the main process and set the initial output directory. Enumerate
   * the EPL programs in the resources directory and save them to the state so they
   * can be rendered as options in the drop down list below.
   */
  componentDidMount() {
    ipcRenderer
      .invoke('getHomeDirectory')
      .then((homeDirectory) => {
        let initRootDirectory;
        if (process.platform === 'win32') {
          initRootDirectory = `${homeDirectory}\\Desktop\\EyeCandyData`;
        } else {
          initRootDirectory = `${homeDirectory}/Desktop/EyeCandyData`;
        }
        this.setState({
          rootDirectory: initRootDirectory,
        });
        return null;
      })
      .catch(() => {
        console.log('Failed to get home directory');
      });
  }

  /*
   * The componentDidUpdate() function is invoked immediately after updating occurs and
   * is a good place for us to update the log text area scroll position.
   */
  componentDidUpdate() {
    if (
      this.logTextArea.current &&
      this.logTextArea.current.scrollTop !==
        this.logTextArea.current.scrollHeight
    ) {
      this.logTextArea.current.scrollTop = this.logTextArea.current.scrollHeight;
    }
  }

  /*
   * React uses one way binding between the state and the view. One effect of this approach
   * is the need to detect changes to the UI controls and reflect them back to the state.
   * Define generic input and textarea handlers that work by virtue of the fact that the
   * input element names match state field names.
   */
  onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target && event.target.name && event.target.value) {
      this.setState(({
        [event.target.name]: event.target.value,
      } as unknown) as ControlState);
    }
  }

  onCheckboxChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target && event.target.name) {
      this.setState(({
        [event.target.name]: event.target.checked,
      } as unknown) as ControlState);
    }
  }

  onTextAreaChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    if (event.target && event.target.name && event.target.value) {
      this.setState(({
        [event.target.name]: event.target.value,
      } as unknown) as ControlState);
    }
  }

  /*
   * The following functions are invoked when the user reorders the video list, clicks the
   * button to add a new video, or removes an existing video. Each action is handled in a
   * specific way to meet React's constraints on modifying the state.
   */
  onVideoListUpdate(newList) {
    this.setState({
      videos: newList,
    });
  }

  onAddVideo(event) {
    const selectedVideo: string | null = ipcRenderer.sendSync('selectVideo');
    if (selectedVideo === null) {
      return;
    }
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const videoObject = {
      id,
      path: selectedVideo,
    };
    console.log(`## Adding video object: ${JSON.stringify(videoObject)}`);
    this.setState((prevState) => ({
      videos: [...prevState.videos, videoObject],
    }));
  }

  onRemoveVideo(event) {
    const { id } = event.target;
    console.log(`## Removing video ID: ${id}`);
    this.setState((prevState) => ({
      videos: prevState.videos.filter(function (e) {
        return e.id !== id;
      }),
    }));
  }

  /*
   * The following callback is invoked when the user wants to run the projector detection
   * process again.
   */
  onProjectorRefresh(event) {
    console.log('## Refresh projector');
  }

  /*
   * The following two functions will be invoked when the user clicks the Compile/Start
   * buttons or the Stop button. In both cases, the signals will be passed to the main
   * process.
   */
  onStartButtonClick(event: React.MouseEvent<HTMLInputElement, MouseEvent>) {
    console.log('## Start');
    /*
    // Create an instance of the StartProgram arguments
    const args: StartProgram = new StartProgram();
    args.rootDirectory = this.state.rootDirectory;
    args.outputName = this.state.outputName;
    args.ffmpegPath = this.state.ffmpegPath;
    args.seed = this.state.seed;
    args.stampFrames = this.state.stampFrames;
    args.saveStimuli = this.state.saveStimuli;
    args.limitSeconds = this.state.limitSeconds;
    args.width = this.state.width;
    args.height = this.state.height;
    args.fps = this.state.fps;
    args.programName = this.state.programName;
    args.programText = this.state.programText.toString();
    args.compileOnly =
      event.target && (event.target as HTMLInputElement).value === 'Compile';
    ipcRenderer.send('startProgram', JSON.stringify(args));

    // Set the state to running so the UI will lock until the main process releases it
    this.setState(({
      running: true,
      progress: 0,
      imageUrl: '',
    } as unknown) as ControlState);
    */
  }

  onStopButtonClick() {
    console.log('## Stop');
    // ipcRenderer.send('cancelProgram');
  }

  /*
   * The onLog() function will be invoked by the main process when it has a message to
   * append to the log text area.
   */
  onLog(_event: IpcRendererEvent, message: string) {
    this.setState((prevState) => ({
      log: prevState.log + message,
    }));
  }

  /*
   * The onRunPreviewChannel() function will be invoked by the main process when the
   * run has started. It contains the root for the eye-native module and the name of
   * the video preview channel.
   */
  onRunPreviewChannel(
    _event: IpcRendererEvent,
    moduleRoot: string,
    channelName: string
  ) {
    // Set the module root to initialize the native library
    eyeNative.setModuleRoot(moduleRoot);

    // Open the preview channel and start calling onPreviewInterval() at an interval
    // equivalent to twice the video rate.
    const ret = eyeNative.openPreviewChannel(channelName);
    if (ret !== '') {
      const message = `Error opening preview channel: ${ret}\n`;
      this.setState((prevState) => ({
        log: prevState.log + message,
      }));
      return;
    }
    let timeout = 30;
    if (this.state.fps !== 0) {
      timeout = 1000 / this.state.fps;
    }
    this.previewInterval = setInterval(this.onPreviewInterval, timeout);
  }

  /*
   * The onPreviewInterval() function will be invoked a regular intervals while the
   * program is being run and frames are being captured. It retrieves the latest frame
   * from the native layer and displays it in the preview div.
   */
  onPreviewInterval() {
    if (!this.previewContainer.current) {
      console.log(`Missing preview container reference`);
      return;
    }
    const ret = eyeNative.getNextFrame(
      this.previewContainer.current.clientWidth,
      this.previewContainer.current.clientHeight
    );
    if (ret === null) {
      return;
    }
    if (!(ret instanceof Uint8Array)) {
      console.log(
        `Preview frame is an unexpected data type: ${ret.constructor.name}`
      );
      return;
    }
    const image = nativeImage.createFromBuffer(Buffer.from(ret));
    const size = image.getSize();
    this.setState(({
      imageUrl: image.toDataURL(),
      imageTop: (this.previewContainer.current.clientHeight - size.height) / 2,
      imageLeft: (this.previewContainer.current.clientWidth - size.width) / 2,
      imageWidth: size.width,
      imageHeight: size.height,
    } as unknown) as ControlState);
  }

  /*
   * The onRunProgress() function will be invoked by the main process at regular
   * intervals to notify the control window as the run progresses.
   */
  onRunProgress(
    _event: IpcRendererEvent,
    frameNumber: number,
    framesTotal: number
  ) {
    let progress = Math.round((frameNumber * 100) / framesTotal);
    if (progress > 100) {
      progress = 100;
    }
    this.setState(({
      progress,
    } as unknown) as ControlState);
  }

  /*
   * The onRunStopped() function will be invoked by the main process when the run has
   * stopped due to completion or failure.
   */
  onRunStopped(_event: IpcRendererEvent) {
    if (this.previewInterval !== null) {
      eyeNative.closePreviewChannel();
      clearInterval(this.previewInterval);
      this.previewInterval = null;
    }
    this.setState((prevState) => ({
      log: `${prevState.log}\n`,
      running: false,
    }));
  }

  /*
   * The onDirectorySelectClick() callback is invoked when the user wants to select
   * the root directory. Pass the event to the main process using IPC.
   */
  onDirectorySelectClick() {
    const selectedDirectory: string | null = ipcRenderer.sendSync(
      'selectRootDirectory',
      this.state.rootDirectory
    );
    if (selectedDirectory !== null) {
      this.setState({
        rootDirectory: selectedDirectory,
      });
    }
  }

  /*
   * In a similar fashion, the onFfmpegSelectClick() callback is invoked when the user
   * wants to select the ffmpeg executable. Pass the event to the main process using IPC.
   */
  onFfmpegSelectClick() {
    const selectedFfmpeg: string | null = ipcRenderer.sendSync(
      'selectFfmpegPath',
      this.state.ffmpegPath
    );
    if (selectedFfmpeg !== null) {
      this.setState({
        ffmpegPath: selectedFfmpeg,
      });
    }
  }

  /*
   * The onToggleSettingsDialog() callback is invoked to toggle the settings model dialog
   * open and close.
   */
  onToggleSettingsDialog() {
    this.setState((prevState) => ({
      settingsOpen: !prevState.settingsOpen,
    }));
  }

  /*
   * The render() function converts the state into a JSX description of the interface
   * that should be displayed and the framework will update the output as necessary.
   */
  render() {
    // Check if we're not ready to start running.
    const notReadyToRun: boolean =
      this.state.outputName.length === 0 ||
      this.state.rootDirectory.length === 0 ||
      this.state.ffmpegPath.length === 0 ||
      this.state.projectorLatency === 0 ||
      this.state.videos.length === 0 ||
      this.state.projDetected === false ||
      this.state.fps === 0;
    let projInfo = '';
    if (this.state.projDetected) {
      projInfo = `Max ${this.state.projWidth} x ${this.state.projHeight} at ${this.state.projMaxFps} fps`;
    } else {
      projInfo = 'Not detected';
    }
    const previewContainerStyle = {
      top: `${this.state.imageTop}px`,
      left: `${this.state.imageLeft}px`,
      width: `${this.state.imageWidth}px`,
      height: `${this.state.imageHeight}px`,
    };

    return (
      <div className={styles.container}>
        <div className={styles.row}>
          <div className={styles.field}>Output</div>
          <div className={styles.value}>
            <input
              className={styles.input}
              type="text"
              name="outputName"
              value={this.state.outputName}
              disabled={this.state.running}
              onChange={this.onInputChange}
            />
          </div>
          <input
            className={styles.settings}
            type="button"
            disabled={this.state.running}
            onClick={this.onToggleSettingsDialog}
          />
        </div>
        <div className={styles.rows}>
          <div className={styles.field}>
            Videos
            <input
              className={styles.addVideo}
              type="button"
              disabled={this.state.running}
              onClick={this.onAddVideo}
            />
          </div>
          <div className={styles.videoList}>
            <ReOrderableList
              name="videoList"
              list={this.state.videos}
              onListUpdate={this.onVideoListUpdate}
              component={ListGroup}
            >
              {this.state.videos.map((data, index) => (
                <ReOrderableItem key={`item-${data.id}`}>
                  <ListGroup.Item>
                    <div className={styles.videoListItem}>
                      {data.path}
                      <input
                        className={styles.removeVideo}
                        type="button"
                        disabled={this.state.running}
                        onClick={this.onRemoveVideo}
                        id={data.id}
                      />
                    </div>
                  </ListGroup.Item>
                </ReOrderableItem>
              ))}
            </ReOrderableList>
          </div>
        </div>
        <div className={styles.rows}>
          <div className={styles.field}>Metadata</div>
          <textarea
            className={styles.metadataTextArea}
            ref={this.metadataTextArea}
            name="metadata"
            value={this.state.metadata}
            onChange={this.onTextAreaChange}
          />
        </div>
        <div className={styles.row}>
          <div className={styles.field}>Projector</div>
          <div className={styles.value}>{projInfo}</div>
          <input
            className={styles.refresh}
            type="button"
            disabled={this.state.running}
            onClick={this.onProjectorRefresh}
          />
        </div>
        <div className={styles.row}>
          <div className={styles.field}>Playback</div>
          <div className={styles.value}>
            <input
              className={styles.inputNarrow}
              type="text"
              name="fps"
              value={this.state.fps}
              disabled={this.state.running}
              onChange={this.onInputChange}
            />
            <div className={styles.videoFormatText}>fps</div>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.buttons}>
            <div className={styles.buttonPadding} />
            <input
              className={styles.button}
              type="button"
              value="Run"
              disabled={notReadyToRun || this.state.running}
              onClick={this.onStartButtonClick}
            />
            <input
              className={styles.button}
              type="button"
              value="Stop"
              disabled={notReadyToRun || !this.state.running}
              onClick={this.onStopButtonClick}
            />
            <div
              className={styles.progress}
              style={this.state.running ? {} : { visibility: 'hidden' }}
            >
              {`${this.state.progress.toString()}%`}
            </div>
          </div>
        </div>
        <div className={styles.log}>
          <textarea
            className={styles.logTextArea}
            ref={this.logTextArea}
            name="programText"
            value={this.state.log}
            readOnly
            onChange={this.onTextAreaChange}
          />
        </div>
        <div className={styles.previewOuter} ref={this.previewContainer}>
          <div className={styles.previewInner} style={previewContainerStyle}>
            <img
              className={styles.previewImage}
              src={this.state.imageUrl}
              style={this.state.running ? {} : { visibility: 'hidden' }}
              alt=""
            />
          </div>
        </div>

        <Modal
          className={styles.modalContent}
          overlayClassName={styles.modalOverlay}
          isOpen={this.state.settingsOpen}
          onRequestClose={this.onToggleSettingsDialog}
          contentLabel="Settings"
        >
          <div className={styles.modalContainer}>
            <div className={styles.modalRow}>
              <div className={styles.modalField}>Root directory</div>
              <div className={styles.value}>
                <input
                  className={styles.input}
                  type="text"
                  name="rootDirectory"
                  value={this.state.rootDirectory}
                  onChange={this.onInputChange}
                />
                <input
                  className={styles.dirSelect}
                  type="button"
                  onClick={this.onDirectorySelectClick}
                />
              </div>
            </div>
            <div className={styles.modalRow}>
              <div className={styles.modalField}>Ffmpeg location</div>
              <div className={styles.value}>
                <input
                  className={styles.input}
                  type="text"
                  name="ffmpegPath"
                  value={this.state.ffmpegPath}
                  onChange={this.onInputChange}
                />
                <input
                  className={styles.dirSelect}
                  type="button"
                  onClick={this.onFfmpegSelectClick}
                />
              </div>
            </div>
            <div className={styles.modalRow}>
              <div className={styles.modalField}>Projector latency</div>
              <input
                className={styles.input}
                type="text"
                name="projectorLatency"
                value={this.state.projectorLatency}
                onChange={this.onInputChange}
              />
              ms
            </div>
            <div className={styles.modalRow}>
              <div className={styles.modalField}>Scale to fit:</div>
              <div className={styles.value}>
                <input
                  type="checkbox"
                  name="scaleToFit"
                  checked={this.state.scaleToFit}
                  onChange={this.onCheckboxChange}
                />
              </div>
            </div>
          </div>
        </Modal>
      </div>
    );
  }
}
