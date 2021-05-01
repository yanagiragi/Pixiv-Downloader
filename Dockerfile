FROM node:16.0.0
MAINTAINER yanagiragi <yanagiragi@csie.io>

ADD https://api.github.com/repos/yanagiragi/Pixiv-Downloader/git/refs/heads/v3 version.json

RUN git clone https://github.com/yanagiragi/Pixiv-Downloader.git
RUN cd Pixiv-Downloader && npm install
