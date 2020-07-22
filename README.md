# Eye Candy

**Note.** This project is currently in a state of flux while it is being ported to the Electron framework. The [old project](old/README.md) is still around and can be found in the `old` folder.

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
