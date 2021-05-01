#!/bin/bash

REPO_ROOT=/Pixiv-Downloader
DOCKER_IMAGE_TAG=pixivdl

SETTINGJSON=${SETTINGJSON:-$REPO_ROOT/bin/data/setting.json}
CACHEJSON=${SETTINGJSON:-$REPO_ROOT/bin/data/cache.json}

if [ -z ${SESSION+x} ]; then 
	echo "SESSION variable is not set. Abort."; 
else 
	# use docker in rootless mode
	cd ~/Pixiv-Downloader/bin && \
	~/bin/docker run -itd \
		-v $(pwd)/Storage:$REPO_ROOT/bin/Storage \
		-v $(pwd)/data:$REPO_ROOT/bin/data \
		$DOCKER_IMAGE_TAG \
		bash -c "cd $REPO_ROOT/bin && /usr/local/bin/node cli.js -s  $SETTINGJSON -c $CACHEJSON -i $SESSION"
		#bash
fi

