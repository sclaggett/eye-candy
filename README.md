# Eye Candy

**Note.** This project is currently in a state of flux while it is being ported to the Electron framework. The [old project](old/README.md) is still around and can be found in the `old` folder.

All frameworks used here are under the permissive MIT license: Electron, Electron React Boilerplate, React, Redux, React Router, Webpack, and React Hot Loader.

test.yml all types:
os: [macos-10.14, windows-2019, ubuntu-18.04]

## Data types

The are five types of data generated by the Eye Candy system:

1. Calibration: System latencies as measured by a calibration process.
2. Program: Stimulation sequence written in the Eye Candy programming language.
3. Sequence: Series of programs that are run sequentially.
4. Study: High-level construct used to group experiments.
5. Experiment: A run of a single program or a sequence of programs.

These can be further divided into two categories:

1. System-wide: Data that are accessible by all users of the system.
   a. Calibrations
   b. Stock programs (read-only)
   c. Stock sequences (read-only)
2. User-specific: Data that are associated with a specific user. The ability of users to see and edit one another's data is handled by the OS.
   a. Studies
   b. Custom programs
   c. Custom sequences
   d. Experiments

## Type parameters

Each data type listed above has an array of key-value pairs associated with it. Each of these values is of a specific type, can be set by the user, may have a default, and may be limited to certain options. The supported value types are:

- string: Single line of text
- text: Multiple lines of text
- number: Real number
- date: Calendar date
- time: Time of day
- path: Location on the file system
- dropdown: List of options
- array: Array of items that share a common key set

### 1. Calibration

- Key: Projector; type: string
- Key: Display latency (ms); type: number

Example:

- Projector: Lightcrafter
- Display latency (ms): 35

### 2. Program

- Key: File; type: path
- Key: Name; type: string
- Key: Description; type: text
- Key: Version; type: string
- Key: Parameters; type: array
  - Key: Name; type: string
  - Key: Description; type: string
  - Key: Initial value; type: string

Example:

- File: ./stock/20faces.js
- Name: 20faces
- Version: 0.2.0
- Parameter 1:
  - Name: duration
  - Initial value: 0.5
- Parameter 2:
  - Name: repetitions
  - Initial value: 60
- Parameter 3:
  - Name: scaleX
  - Initial value: 2
- Parameter 4:
  - Name: scaleY
  - Initial value: 2
- Parameter 5:
  - Name: maleImages
  - Initial value: [1,2,3,4,5,6,7,8,9,10]
- Parameter 6:
  - Name: femaleImages
  - Initial value: [11,12,15,21,25,26,28,29,37,39]
- Parameter 7:
  - Name: subImages
  - Initial value: ["a", "b"]

### 3. Sequence

- Key: Name; type: string
- Key: Description; type: text
- Key: Programs; type: array
  - Key: File; type: path

Example:

- Name: Long series of experiments
- Programs:
  - /home/darwin/programs/experiment-a.js
  - ./stock/rest-period.js
  - /home/darwin/programs/experiment-b.js
  - ./stock/rest-period.js
  - /home/darwin/programs/experiment-c.js

### 4. Study

- Key: Title; type: string
- Key: Purpose; type: text
- Key: Affiliation; type: string; default: University of Washington Medicine
- Key: Lab; type: string; default: Van Gelder Lab
- Key: People; type: string; default: Tyler Benster, Darwin Babino

### 5. Experiment

- Key: Number; type: number
- Key: Seed; type: number; default: 108
- Key: Animal number; type: number; default: 1
- Key: Cage number; type: number
- Key: Species; type: string; mouse
- Key: Animal type; type: string
- Key: Date of birth; type: date
- Key: Sex; type: dropdown; options: Male, Female
- Key: Eye; type: dropdown; options: Left, Right
- Key: Retina location; type: dropdown; options: Center, Periphery
- Key: Retina orientation (°CCW); type: number; default: 0
- Key: Time of dissection; type: time
- Key: Retina solution; type: string; default: AMES
- Key: Retina weight; type: number
- Key: MEA system; type: dropdown; options: BioCAM X, USB-ME64-System
- Key: Chip type; type: dropdown; options: HD-MEA Accura, HD-MEA Arena, HD-MEA Stimulo
- Key: MEA temperature; type: number
- Key: Perfusion temperature; type: number
- Key: Perfusion flow rate; type: number
- Key: Pinhole (0-1); type: number

## File system

The user specifies a root folder where all Eye Candy data will be stored:

root = /home/sclaggett/eyecandy

All experiments for a given day will be stored in a single directory along with the data captured by the MEA system:

${root}/2020-08-04/Experiment1.txt
  ${root}/2020-08-04/Experiment2.txt
${root}/2020-08-04/Experiment3.txt
  ${root}/2020-08-04/[MEA files]

Studies and custom programs and sequences are stored by name in the following subdirectories:

${root}/studies/${study name}.txt
${root}/programs/${program name}.txt
${root}/sequences/${sequence name}.txt

The new project is based on the [electron-react-boilerplate](https://electron-react-boilerplate.js.org/) repository which combines the [Electron](https://electron.atom.io/), [React](https://facebook.github.io/react/), [Redux](https://github.com/reactjs/redux), [React Router](https://github.com/reactjs/react-router), [Webpack](https://webpack.github.io/docs/) and [React Hot Loader](https://github.com/gaearon/react-hot-loader) frameworks into a single cross-platform desktop application.

Installation:

```sh
$ git clone git@github.com:sclaggett/eye-candy.git
$ cd eye-candy
$ yarn
```

Running in development mode:

```sh
$ yarn dev
```

Packaging for production:

```sh
$ yarn package
```

Running production build locally:

```sh
$ yarn start
```

```sh
$ cd eye-candy/old
$ rsync -c -rlgoz . {user@host}:~/eye-candy
```
