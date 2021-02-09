import React from 'react';
import { IpcRendererEvent } from 'electron';
import * as styles from './Control.css';
import StartProgram from '../../common/StartProgram';

const { ipcRenderer, nativeImage } = require('electron');
const fs = require('fs');

// Require the eye-native library but remember that we can't use it in a renderer
// process until the main process notifies us of the module root
const eyeNative = require('eye-native');

type ControlProps = {
  dummy: string;
};

type ControlState = {
  outputDirectory: string;
  rootFileName: string;
  width: number;
  height: number;
  fps: number;
  ffmpegPath: string;
  seed: number;
  log: string;
  running: boolean;
  imageUrl: string;
  imageTop: number;
  imageLeft: number;
  imageWidth: number;
  imageHeight: number;
  programNames: string[];
  selectedProgramName: string;
  programText: string;
};

export default class Control extends React.Component<
  ControlProps,
  ControlState
> {
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
      outputDirectory: '',
      rootFileName: 'test',
      width: 1024,
      height: 720,
      fps: 30,
      ffmpegPath: initFfmpegPath,
      seed: 108,
      log: '',
      running: false,
      imageUrl: '',
      imageTop: 0,
      imageLeft: 0,
      imageWidth: 0,
      imageHeight: 0,
      programNames: ['New'],
      selectedProgramName: 'New',
      programText: '',
    };

    // Initialize variables
    this.logTextArea = React.createRef();
    this.previewContainer = React.createRef();
    this.previewInterval = null;

    // Bind the IPC handlers and other callbacks so "this" will be defined when
    // they are invoked
    this.onLog = this.onLog.bind(this);
    this.onRunPreviewChannel = this.onRunPreviewChannel.bind(this);
    this.onPreviewInterval = this.onPreviewInterval.bind(this);
    this.onRunStopped = this.onRunStopped.bind(this);

    // Listen for IPC calls
    ipcRenderer.on('log', this.onLog);
    ipcRenderer.on('runPreviewChannel', this.onRunPreviewChannel);
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
        let initOutputDirectory;
        if (process.platform === 'win32') {
          initOutputDirectory = `${homeDirectory}\\Desktop\\EyeCandyData`;
        } else {
          initOutputDirectory = `${homeDirectory}/Desktop/EyeCandyData`;
        }
        this.setState({
          outputDirectory: initOutputDirectory,
        });
        return null;
      })
      .catch(() => {
        console.log('Failed to get home directory');
      });

    fs.readdir('./resources/programs', (err: Error, dir: string[]) => {
      if (err) {
        throw new Error(`Failed to read programs directory: ${err}`);
      }
      const programNames: string[] = [];
      for (let i = 0; i < dir.length; i += 1) {
        programNames.push(dir[i]);
      }
      this.setState((prevState) => ({
        programNames: prevState.programNames.concat(programNames),
      }));
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

  onTextAreaChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    if (event.target && event.target.name && event.target.value) {
      this.setState(({
        [event.target.name]: event.target.value,
      } as unknown) as ControlState);
    }
  }

  /*
   * The onDirectorySelectClick() callback is invoked when the user wants to select
   * the output directory. Pass the event to the main process using IPC.
   */
  onDirectorySelectClick() {
    const selectedDirectory: string | null = ipcRenderer.sendSync(
      'selectOutputDirectory',
      this.state.outputDirectory
    );
    if (selectedDirectory !== null) {
      this.setState({
        outputDirectory: selectedDirectory,
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
   * The following two functions will be invoked when the user clicks the Compile/Start
   * buttons or the Stop button. In both cases, the signals will be passed to the main
   * process.
   */
  onStartButtonClick(event: React.MouseEvent<HTMLInputElement, MouseEvent>) {
    // Create an instance of the StartProgram arguments
    const args: StartProgram = new StartProgram();
    args.outputDirectory = this.state.outputDirectory;
    args.rootFileName = this.state.rootFileName;
    args.programName = this.state.selectedProgramName;
    args.programText = this.state.programText.toString();
    args.seed = this.state.seed;
    args.width = this.state.width;
    args.height = this.state.height;
    args.ffmpegPath = this.state.ffmpegPath;
    args.fps = this.state.fps;
    args.compileOnly =
      event.target && (event.target as HTMLInputElement).value === 'Compile';
    ipcRenderer.send('startProgram', JSON.stringify(args));

    // Set the state to running so the UI will lock until the main process releases it
    this.setState(({
      running: true,
    } as unknown) as ControlState);
  }

  onStopButtonClick() {
    ipcRenderer.send('cancelProgram');
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
    let timeout = 10;
    if (this.state.fps !== 0) {
      timeout = 1000 / this.state.fps / 2;
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
   * The onProgramSelected() callback is invoked when the user selects a program name from
   * the dropdown.
   */
  onProgramSelected(event: React.ChangeEvent<HTMLSelectElement>) {
    // Get the program name
    if (
      event.target === null ||
      event.target.value === null ||
      event.target.value === undefined
    ) {
      return;
    }
    const programName: string = event.target.value as string;

    // Update the state
    this.setState(({
      selectedProgramName: programName,
    } as unknown) as ControlState);

    // Clear the program if "New" was selected
    if (programName === 'New') {
      this.setState(({
        programText: '',
      } as unknown) as ControlState);
      return;
    }

    // Load the program from the file system
    fs.readFile(
      `./resources/programs/${programName}`,
      (err: Error, data: string) => {
        // Make sure the file was loaded successfully
        if (err) {
          throw err;
        }

        // Set the program text
        this.setState(({
          programText: data,
        } as unknown) as ControlState);
      }
    );
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
   * The render() function converts the state into a JSX description of the interface
   * that should be displayed and the framework will update the output as necessary.
   */
  render() {
    // Check if we're not ready to start running.
    const notReadyToRun: boolean =
      this.state.outputDirectory.length === 0 ||
      this.state.rootFileName.length === 0 ||
      this.state.programText.length === 0 ||
      this.state.width === 0 ||
      this.state.height === 0 ||
      this.state.fps === 0;
    const previewContainerStyle = {
      top: `${this.state.imageTop}px`,
      left: `${this.state.imageLeft}px`,
      width: `${this.state.imageWidth}px`,
      height: `${this.state.imageHeight}px`,
    };

    return (
      <div className={styles.container}>
        <div className={styles.logo}>
          <img
            src="../../resources/EC_Logo_DS_black_backg.png"
            id="logo"
            alt=""
          />
          <h1>Eye Candy</h1>
        </div>
        <div className={styles.columns}>
          <div className={styles.columnLeft}>
            <div className={styles.row}>
              <div className={styles.field}>Output directory:</div>
              <div className={styles.value}>
                <input
                  className={styles.input}
                  type="text"
                  name="outputDirectory"
                  value={this.state.outputDirectory}
                  disabled={this.state.running}
                  onChange={this.onInputChange.bind(this)}
                />
                <input
                  className={styles.dirSelect}
                  type="button"
                  disabled={this.state.running}
                  onClick={this.onDirectorySelectClick.bind(this)}
                />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>Ffmpeg path:</div>
              <div className={styles.value}>
                <input
                  className={styles.input}
                  type="text"
                  name="ffmpegPath"
                  value={this.state.ffmpegPath}
                  disabled={this.state.running}
                  onChange={this.onInputChange.bind(this)}
                />
                <input
                  className={styles.dirSelect}
                  type="button"
                  disabled={this.state.running}
                  onClick={this.onFfmpegSelectClick.bind(this)}
                />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>Root file name:</div>
              <div className={styles.value}>
                <input
                  className={styles.input}
                  type="text"
                  name="rootFileName"
                  value={this.state.rootFileName}
                  disabled={this.state.running}
                  onChange={this.onInputChange.bind(this)}
                />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>Video format:</div>
              <div className={styles.value}>
                <input
                  className={styles.inputNarrow}
                  type="text"
                  name="width"
                  value={this.state.width}
                  disabled={this.state.running}
                  onChange={this.onInputChange.bind(this)}
                />
                <div className={styles.videoFormatText}>x</div>
                <input
                  className={styles.inputNarrow}
                  type="text"
                  name="height"
                  value={this.state.height}
                  disabled={this.state.running}
                  onChange={this.onInputChange.bind(this)}
                />
                <div className={styles.videoFormatText}>@</div>
                <input
                  className={styles.inputNarrow}
                  type="text"
                  name="fps"
                  value={this.state.fps}
                  disabled={this.state.running}
                  onChange={this.onInputChange.bind(this)}
                />
                <div className={styles.videoFormatText}>fps</div>
                [x]
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>Randomizer seed:</div>
              <div className={styles.value}>
                <input
                  className={styles.inputNarrow}
                  type="text"
                  name="seed"
                  value={this.state.seed}
                  disabled={this.state.running}
                  onChange={this.onInputChange.bind(this)}
                />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.buttons}>
                <input
                  className={styles.button}
                  type="button"
                  value="Compile"
                  disabled={notReadyToRun || this.state.running}
                  onClick={this.onStartButtonClick.bind(this)}
                />
                <input
                  className={styles.button}
                  type="button"
                  value="Run"
                  disabled={notReadyToRun || this.state.running}
                  onClick={this.onStartButtonClick.bind(this)}
                />
                <input
                  className={styles.button}
                  type="button"
                  value="Stop"
                  disabled={notReadyToRun || !this.state.running}
                  onClick={this.onStopButtonClick.bind(this)}
                />
              </div>
            </div>
            <div className={styles.log}>
              <textarea
                className={styles.logTextArea}
                ref={this.logTextArea}
                name="programText"
                value={this.state.log}
                readOnly
                onChange={this.onTextAreaChange.bind(this)}
              />
            </div>
            <div className={styles.previewOuter} ref={this.previewContainer}>
              <div
                className={styles.previewInner}
                style={previewContainerStyle}
              >
                <img
                  className={styles.previewImage}
                  src={this.state.imageUrl}
                  alt="Rain falling softly on the roof"
                />
              </div>
            </div>
          </div>
          <div className={styles.columnRight}>
            <div className={styles.row}>
              <div className={styles.field}>Program:</div>
              <div className={styles.programNames}>
                <select
                  className={styles.input}
                  name="selectedProgramName"
                  value={this.state.selectedProgramName}
                  disabled={this.state.running}
                  onChange={this.onProgramSelected.bind(this)}
                >
                  {this.state.programNames.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.programText}>
              <textarea
                className={styles.programTextArea}
                name="programText"
                value={this.state.programText}
                disabled={this.state.running}
                onChange={this.onTextAreaChange.bind(this)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
