#!/bin/bash

REPO_ROOT=/Pixiv-Downloader
DOCKER_IMAGE_TAG=pixivdl

SESSION=$1

# use docker in rootless mode
~/bin/docker run -it \
	-v $(pwd)/Storage:$REPO_ROOT/bin/Storage \
	$DOCKER_IMAGE_TAG \
	bash -c "/usr/local/bin/node $REPO_ROOT/bin/cli.js -s settings.json -c cache.json -i $SESSION"
