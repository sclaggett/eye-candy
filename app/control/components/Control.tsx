import React from 'react';

const fs = require('fs');

export default class Control extends React.Component {
  constructor(props) {
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
      animalGender: 'male',
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
    fs.readdir('./resources/programs', (err, dir) => {
      const programs = [];
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
  onInputChange(event) {
    this.setState({
      [event.target.name]: event.target.value,
    });
  }

  onLoadClick() {
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

  render() {
    return (
      <div>
        <div id="logo">
          <h1>
            <img
              src="./../resources/EC_Logo_DS_black_backg.png"
              id="logo"
              alt=""
            />
            Eye Candy
          </h1>
        </div>
        <h2>Study</h2>
        Affiliation:
        <input
          type="text"
          name="studyAffiliation"
          value={this.state.studyAffiliation}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        Lab:
        <input
          type="text"
          name="studyLab"
          value={this.state.studyLab}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        People:
        <input
          type="text"
          name="studyPeople"
          value={this.state.studyPeople}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        Purpose:
        <input
          type="text"
          name="studyPurpose"
          value={this.state.studyPurpose}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        <h2>Animal</h2>
        Animal Number:
        <input
          type="number"
          name="animalNumber"
          min="1"
          value={this.state.animalNumber}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        Species:
        <input
          type="text"
          name="animalSpecies"
          value={this.state.animalSpecies}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        Type (mel, melrd, black6, black6rd, gnat1gnat2mel):
        <br />
        <input
          type="text"
          name="animalType"
          value={this.state.animalType}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        Date of birth (YYYY/MM/DD):
        <br />
        <input
          type="date"
          name="animalDOB"
          value={this.state.animalDOB}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        Gender:
        <input
          type="radio"
          name="animalGender"
          value="male"
          checked={this.state.animalGender === 'male'}
          onChange={this.onInputChange.bind(this)}
        />
        Male
        <input
          type="radio"
          name="animalGender"
          value="female"
          checked={this.state.animalGender === 'female'}
          onChange={this.onInputChange.bind(this)}
        />
        Female
        <br />
        <h2>Retina</h2>
        Eye:
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
        <br />
        Location (center or periphery):
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
        <br />
        Orientation (in degrees counterclockwise if known):
        <input
          type="number"
          name="retinaOrientation"
          min="-359"
          max="359"
          value={this.state.retinaOrientation}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        Time of dissection:
        <input
          type="time"
          name="retinaDissection"
          value={this.state.retinaDissection}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        Solution (comma separated, e.g. &quot;AMES,DAD&quot;):
        <input
          type="text"
          name="retinaSolution"
          value={this.state.retinaSolution}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        Weight:
        <input
          type="text"
          name="retinaWeight"
          value={this.state.retinaWeight}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        <h2>Physical Parameters</h2>
        MEA type:
        <input
          type="text"
          name="meaType"
          value={this.state.meaType}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        MEA temperature:
        <input
          type="text"
          name="meaTemperature"
          value={this.state.meaTemperature}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        Perfusion temperature:
        <input
          type="text"
          name="perfusionTemperature"
          value={this.state.perfusionTemperature}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        Perfusion flow rate:
        <input
          type="text"
          name="perfusionFlowRate"
          value={this.state.perfusionFlowRate}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        Pinhole (between 0 and 1, if applicable):
        <input
          type="text"
          name="pinHole"
          value={this.state.pinHole}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        <h2>Digital Parameters</h2>
        Display mode:
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
        <br />
        <h2>Experiment</h2>
        Experiment Number:
        <input
          type="number"
          name="experimentNumber"
          min="1"
          value={this.state.experimentNumber}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        Filename:
        <input
          type="text"
          name="experimentFilename"
          value={this.state.experimentFilename}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        Seed:
        <input
          type="number"
          name="experimentSeed"
          min="0"
          value={this.state.experimentSeed}
          onChange={this.onInputChange.bind(this)}
        />
        <br />
        Program:
        <select
          name="selectedProgram"
          value={this.state.selectedProgram}
          onChange={this.onInputChange.bind(this)}
        >
          {this.state.programs.map((program) => (
            <option key={program} value={program}>
              {program}
            </option>
          ))}
        </select>
        <input type="button" value="View source code" />
        <br />
        <input
          type="button"
          value="Load"
          onClick={this.onLoadClick.bind(this)}
        />
        <input
          type="button"
          value="Start"
          disabled={this.state.startDisabled}
          onClick={this.onStartClick.bind(this)}
        />
        <input
          type="button"
          value="Preview"
          disabled={this.state.previewDisabled}
          onClick={this.onPreviewClick.bind(this)}
        />
        <input
          type="button"
          value="Estimate duration"
          disabled={this.state.estimateDisabled}
          onClick={this.onEstimateClick.bind(this)}
        />
        <input
          type="button"
          value="Save video"
          disabled={this.state.saveDisabled}
          onClick={this.onSaveClick.bind(this)}
        />
        <input
          type="button"
          value="Reset"
          onClick={this.onResetClick.bind(this)}
        />
      </div>
    );
  }
}
