# pixiv-img [![Build Status](https://travis-ci.org/akameco/pixiv-img.svg?branch=master)](https://travis-ci.org/akameco/pixiv-img)

> Save the image of pixiv.


## Install

```
$ npm install --save pixiv-img
```


## Usage

Save the image of pixiv in the current directory.

```js
const pixivImg = require('pixiv-img');
const imgUrl = 'http://i3.pixiv.net/img-original/img/2016/03/31/00/31/46/56100246_p0.jpg';

pixivImg(imgUrl).then(output => {
	console.log(output);
});
//=> '56100246_p0.jpg'
```

Use with [pixiv.js](https://github.com/akameco/pixiv.js)

## API

### pixivImg(imgUrl, output)

#### imgUrl

*Required*<br>
Type: `string`

URL of pixiv of img.


#### output

Type: `String`<br>
Default: path.basename(imgUrl)

output path.

## Related

- [pixiv.js](https://github.com/akameco/pixiv.js) - pixiv api client

## License

MIT © [akameco](http://akameco.github.io)
