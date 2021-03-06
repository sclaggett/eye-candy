# eye-native

This is the native library for the *eye-X* projects.

On Windows, you will need to build this project prior to building any of the other projects. The other projects reference this one through a symlink.

On Mac, you do *not* need to build this project unless you're working directly on the native code. The other projects will create a copy of this project in their `node_modules` directories and will build is there as part of their process.

Local development is initialized by running `yarn install` and built by running `yarn build`.

## Compiling OpenCV

The OpenCV libraries for Mac were built from source:

```sh
$ cd <working_directory>
$ git clone https://github.com/opencv/opencv.git
$ git clone https://github.com/opencv/opencv_contrib.git
$ mkdir build_opencv
$ cd build_opencv
$ cmake -D CMAKE_BUILD_TYPE=Release \
  -D OPENCV_EXTRA_MODULES_PATH=../opencv_contrib/modules \
  -D CMAKE_INSTALL_PREFIX=./install \
  -D WITH_WEBP=OFF \
  -D WITH_OPENJPEG=OFF \
  -D WITH_JASPER=OFF \
  -D WITH_OPENEXR=OFF \
  -D WITH_ITT=OFF \
  -D WITH_IPP=OFF \
  -D BUILD_TESTS=OFF \
  -D BUILD_PERF_TESTS=OFF \
  -D BUILD_EXAMPLES=OFF \
  -D BUILD_opencv_apps=OFF \
  -D BUILD_JAVA=OFF \
  -D BUILD_opencv_python2=OFF \
  -D BUILD_opencv_python3=OFF \
  ../opencv
$ make
$ make install
$ rm -rf [$/opencv/mac/lib/*]
$ cp install/lib/libopencv_core*.dylib [$/opencv/mac/lib/]
$ cp install/lib/libopencv_features2d*.dylib [$/opencv/mac/lib/]
$ cp install/lib/libopencv_flann*.dylib [$/opencv/mac/lib/]
$ cp install/lib/libopencv_imgcodecs*.dylib [$/opencv/mac/lib/]
$ cp install/lib/libopencv_imgproc*.dylib [$/opencv/mac/lib/]
$ rm -rf [$/opencv/mac/include/*]
$ cp -R install/include/opencv4/* [$/opencv/mac/include/]
```

## Native development

On Windows, build this project first and then run one of the projects that uses it in development mode.

On Mac, you can shorten your iteration time when developing this library in the context of one of the projects that uses it as follows:

1. Make your changes in eye-native and run `yarn build` to confirm they compile.
2. Force eye-candy to pick up the changes by running the following commands:

```sh
$ cd app && rm -rf node_modules/eye-native && yarn install --check-files && cd ..
$ yarn dev
```

## Windows development

Initial development for Windows was done using a VM on AWS. Do the following to set up the build environment:

1. Provision a new *Microsoft Windows Server 2019 Base* VM on AWS. Spring for a medium-sized VM or you may as well compile by hand.
2. Connect to the VM over RDP.
3. Use IE just long enough to download and install a real browser.
4. Download and install [Git for Windows](https://git-scm.com/download/win) and configure it using Git Bash:

```sh
$ git config --global user.name "Shane Claggett"
$ git config --global user.email shaneclaggett@hushmail.com
$ cd ~/.ssh && ssh-keygen
$ cat id_rsa.pub
```

5. Add the identity to your account on GitHub (Settings, SSH and GPG keys, New SSH key).
6. At this point you should be able to check out the repository:

```sh
$ cd ~
$ git clone git@github.com:sclaggett/eye-native.git
```

7. Install [Node.js](https://nodejs.org/en/). Be sure to check the box to install *Tools for Native Modules*.
8. Installation of native tools will take a long time. Reboot the VM when it completes.
9. Open Git Bash and install yarn:

```sh
$ npm install --global yarn
```

10. At this point everything should work.
