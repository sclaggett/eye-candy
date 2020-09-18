import React from 'react';
import * as styles from './Control.css';
import StartProgram from '../../common/StartProgram';

const ipc = require('electron').ipcRenderer;
const fs = require('fs');

type ControlProps = {
  dummy: string;
};

type ControlState = {
  outputDirectory: string;
  rootFileName: string;
  programNames: string[];
  selectedProgramName: string;
  programText: string;
  width: number;
  height: number;
  fps: number;
  seed: number;
  running: boolean;
};

export default class Control extends React.Component<
  ControlProps,
  ControlState
> {
  constructor(props: ControlProps) {
    super(props);
    this.state = {
      outputDirectory: '',
      rootFileName: '',
      programNames: ['New'],
      selectedProgramName: 'New',
      programText: '',
      width: 1024,
      height: 720,
      fps: 30,
      seed: 0,
      running: false,
    };
  }

  /*
   * The componentDidMount() function is invoked when the component is mounted in the
   * DOM and is a good spot to perform class initialization. Enumerate the EPL programs in
   * the resources directory and save them to the state so they can be rendered
   * as options in the drop down list below.
   */
  componentDidMount() {
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
   * The onDirectorySelectClick() callback is invoked when the user wants to select
   * the output directory. Pass the event to the main process using IPC.
   */
  onDirectorySelectClick() {
    const selectedDirectory: string | null = ipc.sendSync(
      'selectOutputDirectory',
      this.state.outputDirectory
    );
    if (selectedDirectory !== null) {
      this.setState({
        outputDirectory: selectedDirectory,
      });
    }
  }

  onButtonClick() {
    if (!this.state.running) {
      const args: StartProgram = new StartProgram();
      args.outputDirectory = this.state.outputDirectory;
      args.rootFileName = this.state.rootFileName;
      args.programName = this.state.selectedProgramName;
      args.programText = this.state.programText.toString();
      args.seed = this.state.seed;
      args.width = this.state.width;
      args.height = this.state.height;
      args.fps = this.state.fps;
      ipc.send('startProgram', JSON.stringify(args));
    } else {
      console.log('## Cancel program');
    }
  }

  /*
   * The render() function converts the state into a JSX description of the interface
   * that should be displayed and the framework will update the output as necessary.
   */
  render() {
    // Set the button label based on whether we're currently running.
    const buttonLabel: string = this.state.running ? 'Cancel' : 'Start';

    // Check if we're not ready to start running.
    const notReadyToRun: boolean =
      this.state.outputDirectory.length === 0 ||
      this.state.rootFileName.length === 0 ||
      this.state.programText.length === 0 ||
      this.state.width === 0 ||
      this.state.height === 0 ||
      this.state.fps === 0;

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
              <div className={styles.field}>Width:</div>
              <div className={styles.value}>
                <input
                  className={styles.inputNarrow}
                  type="text"
                  name="width"
                  value={this.state.width}
                  disabled={this.state.running}
                  onChange={this.onInputChange.bind(this)}
                />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>Height:</div>
              <div className={styles.value}>
                <input
                  className={styles.inputNarrow}
                  type="text"
                  name="height"
                  value={this.state.height}
                  disabled={this.state.running}
                  onChange={this.onInputChange.bind(this)}
                />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>Frames per second:</div>
              <div className={styles.value}>
                <input
                  className={styles.inputNarrow}
                  type="text"
                  name="fps"
                  value={this.state.fps}
                  disabled={this.state.running}
                  onChange={this.onInputChange.bind(this)}
                />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>Seed:</div>
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
            <div className={styles.preview} />
            <div className={styles.button}>
              <input
                type="button"
                value={buttonLabel}
                disabled={notReadyToRun}
                onClick={this.onButtonClick.bind(this)}
              />
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
