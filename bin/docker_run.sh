#!/bin/bash

REPO_ROOT=/Pixiv-Downloader
DOCKER_IMAGE_TAG=pixivdl

# follow
MODE=$1

# use docker in rootless mode
~/bin/docker run -it \
	-v $(pwd)/Storage:$REPO_ROOT/bin/Storage \
	$DOCKER_IMAGE_TAG \
	bash -c "PIXIV_ACCOUNT=$PIXIV_ACCOUNT PIXIV_PASSWORD=$PIXIV_PASSWORD \
	/usr/local/bin/node $REPO_ROOT/bin/cli.js -m $MODE -v false"
