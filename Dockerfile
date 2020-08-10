FROM node:12.18.0
MAINTAINER yanagiragi <yanagiragi@csie.io>

ADD https://api.github.com/repos/yanagiragi/Pixiv-Downloader/git/refs/heads/master version.json

RUN git clone https://github.com/yanagiragi/Pixiv-Downloader.git
RUN cd Pixiv-Downloader && npm install
