FROM node:10.13-stretch
RUN mkdir -p /www/src
RUN mkdir /www/view
WORKDIR /www
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update && apt-get -y install \
    ffmpeg \
    libx264-dev \
    yarn
COPY web/package.json /www
COPY web/package-lock.json /www
RUN yarn
RUN yarn bundle
COPY web/src /www/src
COPY .git /tmp/
RUN git -C /tmp rev-parse --verify HEAD > /www/git-sha
RUN rm -rf /tmp/.git
