import React from 'react';
import * as styles from './Control.css';

const ipc = require('electron').ipcRenderer;
const fs = require('fs');

type ControlProps = {
  dummy: string;
};

type ControlState = {
  studyAffiliation: string;
  studyLab: string;
  studyPeople: string;
  studyPurpose: string;
  animalNumber: number;
  animalSpecies: string;
  animalType: string;
  animalDOB: string;
  animalSex: string;
  retinaEye: string;
  retinaLocation: string;
  retinaOrientation: number;
  retinaDissection: string;
  retinaSolution: string;
  retinaWeight: string;
  meaType: string;
  meaTemperature: string;
  perfusionTemperature: string;
  perfusionFlowRate: string;
  pinHole: string;
  displayMode: string;
  experimentNumber: string;
  experimentFilename: string;
  experimentSeed: string;
  programs: string[];
  selectedProgram: string;
  startDisabled: boolean;
  previewDisabled: boolean;
  estimateDisabled: boolean;
  saveDisabled: boolean;
};

export default class Control extends React.Component<
  ControlProps,
  ControlState
> {
  constructor(props: ControlProps) {
    super(props);
    this.state = {
      studyAffiliation: 'University of Washington Medicine',
      studyLab: 'Van Gelder Lab',
      studyPeople: 'Tyler Benster, Darwin Babino',
      studyPurpose: '',
      animalNumber: 1,
      animalSpecies: 'mouse',
      animalType: '',
      animalDOB: '',
      animalSex: 'male',
      retinaEye: '',
      retinaLocation: '',
      retinaOrientation: 0,
      retinaDissection: '',
      retinaSolution: 'AMES',
      retinaWeight: 'AMES',
      meaType: '60MEA200/30iR-ITO',
      meaTemperature: '',
      perfusionTemperature: '',
      perfusionFlowRate: '',
      pinHole: '',
      displayMode: 'video',
      experimentNumber: '',
      experimentFilename: '',
      experimentSeed: '108',
      programs: ['video', 'custom'],
      selectedProgram: '',
      startDisabled: true,
      previewDisabled: true,
      estimateDisabled: true,
      saveDisabled: true,
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
        // console.log(`Failed to read programs directory: ${err}`);
        return;
      }
      const programs: string[] = [];
      for (let i = 0; i < dir.length; i += 1) {
        programs.push(dir[i]);
      }
      this.setState((prevState) => ({
        programs: programs.concat(prevState.programs),
      }));
    });
  }

  /*
   * React uses one way binding between the state and the view. One effect of this approach
   * is the need to detect changes to the UI controls and reflect them back to the state.
   * Define a generic handler that works by virtue of the fact that the input element names
   * match state field names.
   */
  onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target && event.target.name && event.target.value) {
      this.setState(({
        [event.target.name]: event.target.value,
      } as unknown) as ControlState);
    }
  }

  onSelectChange(event: React.ChangeEvent<HTMLSelectElement>) {
    if (event.target && event.target.name && event.target.value) {
      this.setState(({
        [event.target.name]: event.target.value,
      } as unknown) as ControlState);
    }
  }

  onLoadClick() {
    ipc.send('test-ipc');
    // console.log('## onLoadClick()');
  }

  onStartClick() {
    // console.log('## onStartClick()');
  }

  onPreviewClick() {
    // console.log('## onPreviewClick()');
  }

  onEstimateClick() {
    // console.log('## onEstimateClick()');
  }

  onSaveClick() {
    // console.log('## onSaveClick()');
  }

  onResetClick() {
    // console.log('## onResetClick()');
  }

  /*
   * The render() function converts the state into a JSX description of the interface
   * that should be displayed and the framework will update the output as necessary.
   * The following code could be decomposed into smaller components which might make
   * everything more readable.
   */
  render() {
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
            <div className={styles.section}>
              <h2>Study</h2>
              <div className={styles.row}>
                <div className={styles.field}>Affiliation:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="text"
                    name="studyAffiliation"
                    value={this.state.studyAffiliation}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Lab:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="text"
                    name="studyLab"
                    value={this.state.studyLab}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>People:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="text"
                    name="studyPeople"
                    value={this.state.studyPeople}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Purpose:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="text"
                    name="studyPurpose"
                    value={this.state.studyPurpose}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
            </div>
            <div className={styles.section}>
              <h2>Animal</h2>
              <div className={styles.row}>
                <div className={styles.field}>Number:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="number"
                    name="animalNumber"
                    min="1"
                    value={this.state.animalNumber}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Species:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="text"
                    name="animalSpecies"
                    value={this.state.animalSpecies}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Type:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="text"
                    name="animalType"
                    value={this.state.animalType}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Date of birth:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="date"
                    name="animalDOB"
                    value={this.state.animalDOB}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Sex:</div>
                <div className={styles.value}>
                  <input
                    type="radio"
                    name="animalSex"
                    value="male"
                    checked={this.state.animalSex === 'male'}
                    onChange={this.onInputChange.bind(this)}
                  />
                  Male
                  <input
                    type="radio"
                    name="animalSex"
                    value="female"
                    checked={this.state.animalSex === 'female'}
                    onChange={this.onInputChange.bind(this)}
                  />
                  Female
                </div>
              </div>
            </div>
            <div className={styles.section}>
              <h2>Retina</h2>
              <div className={styles.row}>
                <div className={styles.field}>Eye:</div>
                <div className={styles.value}>
                  <input
                    type="radio"
                    name="retinaEye"
                    value="left"
                    checked={this.state.retinaEye === 'left'}
                    onChange={this.onInputChange.bind(this)}
                  />
                  Left
                  <input
                    type="radio"
                    name="retinaEye"
                    value="right"
                    checked={this.state.retinaEye === 'right'}
                    onChange={this.onInputChange.bind(this)}
                  />
                  Right
                  <input
                    type="radio"
                    name="retinaEye"
                    value="1"
                    checked={this.state.retinaEye === '1'}
                    onChange={this.onInputChange.bind(this)}
                  />
                  1
                  <input
                    type="radio"
                    name="retinaEye"
                    value="2"
                    checked={this.state.retinaEye === '2'}
                    onChange={this.onInputChange.bind(this)}
                  />
                  2
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Location:</div>
                <div className={styles.value}>
                  <input
                    type="radio"
                    name="retinaLocation"
                    value="center"
                    checked={this.state.retinaLocation === 'center'}
                    onChange={this.onInputChange.bind(this)}
                  />
                  Center
                  <input
                    type="radio"
                    name="retinaLocation"
                    value="periphery"
                    checked={this.state.retinaLocation === 'periphery'}
                    onChange={this.onInputChange.bind(this)}
                  />
                  Periphery
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Orientation (&deg;CCW):</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="number"
                    name="retinaOrientation"
                    min="-359"
                    max="359"
                    value={this.state.retinaOrientation}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Time of dissection:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="time"
                    name="retinaDissection"
                    value={this.state.retinaDissection}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Solution:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="text"
                    name="retinaSolution"
                    value={this.state.retinaSolution}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Weight:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="text"
                    name="retinaWeight"
                    value={this.state.retinaWeight}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
            </div>
            <div className={styles.section}>
              <h2>Experiment</h2>
              <div className={styles.row}>
                <div className={styles.field}>Number:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="number"
                    name="experimentNumber"
                    min="1"
                    value={this.state.experimentNumber}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Filename:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="text"
                    name="experimentFilename"
                    value={this.state.experimentFilename}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Seed:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="number"
                    name="experimentSeed"
                    min="0"
                    value={this.state.experimentSeed}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Program:</div>
                <div className={styles.program}>
                  <select
                    className={styles.input}
                    name="selectedProgram"
                    value={this.state.selectedProgram}
                    onChange={this.onSelectChange.bind(this)}
                  >
                    {this.state.programs.map((program) => (
                      <option key={program} value={program}>
                        {program}
                      </option>
                    ))}
                  </select>
                  <input type="button" value="View source code" />
                </div>
              </div>
            </div>
          </div>
          <div className={styles.columnRight}>
            <div className={styles.section}>
              <h2>Physical Parameters</h2>
              <div className={styles.row}>
                <div className={styles.field}>MEA type:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="text"
                    name="meaType"
                    value={this.state.meaType}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>MEA temperature:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="text"
                    name="meaTemperature"
                    value={this.state.meaTemperature}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Perfusion temperature:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="text"
                    name="perfusionTemperature"
                    value={this.state.perfusionTemperature}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Perfusion flow rate:</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="text"
                    name="perfusionFlowRate"
                    value={this.state.perfusionFlowRate}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>Pinhole (0-1):</div>
                <div className={styles.value}>
                  <input
                    className={styles.input}
                    type="text"
                    name="pinHole"
                    value={this.state.pinHole}
                    onChange={this.onInputChange.bind(this)}
                  />
                </div>
              </div>
            </div>
            <div className={styles.section}>
              <h2>Digital Parameters</h2>
              <div className={styles.row}>
                <div className={styles.field}>Display mode:</div>
                <div className={styles.value}>
                  <input
                    type="radio"
                    name="displayMode"
                    value="video"
                    checked={this.state.displayMode === 'video'}
                    onChange={this.onInputChange.bind(this)}
                  />
                  Video
                  <input
                    type="radio"
                    name="displayMode"
                    value="pattern"
                    checked={this.state.displayMode === 'pattern'}
                    onChange={this.onInputChange.bind(this)}
                  />
                  Pattern
                </div>
              </div>
            </div>
            <div className={styles.section}>
              <h2>Run</h2>
              <div className={styles.preview} />
              <div className={styles.buttons}>
                <input
                  className={styles.button}
                  type="button"
                  value="Load"
                  onClick={this.onLoadClick.bind(this)}
                />
                <input
                  className={styles.button}
                  type="button"
                  value="Start"
                  disabled={this.state.startDisabled}
                  onClick={this.onStartClick.bind(this)}
                />
                <input
                  className={styles.button}
                  type="button"
                  value="Preview"
                  disabled={this.state.previewDisabled}
                  onClick={this.onPreviewClick.bind(this)}
                />
                <input
                  className={styles.button}
                  type="button"
                  value="Estimate duration"
                  disabled={this.state.estimateDisabled}
                  onClick={this.onEstimateClick.bind(this)}
                />
                <input
                  className={styles.button}
                  type="button"
                  value="Save video"
                  disabled={this.state.saveDisabled}
                  onClick={this.onSaveClick.bind(this)}
                />
                <input
                  className={styles.button}
                  type="button"
                  value="Reset"
                  onClick={this.onResetClick.bind(this)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
