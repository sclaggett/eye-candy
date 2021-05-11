# eye-candy

## Development

Initialize the repository:

```sh
$ cd eye-candy
$ yarn
```

Build the native code:

```sh
$ yarn electron-rebuild
```

Build and launch the application in development mode:

```sh
$ yarn dev
```

Save yourself some pain and suffering when committing changes by running the validation checks manually. Start by checking the syntax for errors:

```sh
$ yarn lint
```

You can fix some of the errors automatically by running:

```sh
$ yarn lint --fix
```

Next check for TypeScript errors:

```sh
$ yarn tsc
```

Make sure the package can be built:

```sh
$ yarn package
```

Finally commit your changes using git.
