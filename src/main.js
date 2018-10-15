const PixivImg = require('pixiv-img')
const minimist = require('minimist')
const fs = require('fs')
const sanitize = require('sanitize-filename')
const Pixiv = require('./data').getPixiv()

const StoragePath = '../Storage'
const GetUserPath = 'getUser'

if (require.main === module) {
	let args = minimist(process.argv.slice(2))
	let mode = args.m // mode

	if (!mode) {
		console.log('please define option')
		process.exit()
	} else {
		if (!fs.existsSync(StoragePath)) {
			fs.mkdirSync(StoragePath)
		}
		if (!fs.existsSync(`${StoragePath}/${GetUserPath}`)) {
			fs.mkdirSync(`${StoragePath}/${GetUserPath}`)
		}

		if (mode === 'user') {
			if (typeof args.i !== 'object') {
				args.i = [ args.i ]
			}
			getUser(args)
		}
	}
}

function getIllusts (userid) {
	return new Promise((resolve, reject) => {
		let info = { 'illusts': [] }

		Pixiv.userIllusts(userid).then(o => {
			o.illusts.map(e => info.illusts.push(e))

			if (Pixiv.hasNext()) {
				resolve(getIllustsInternal(info))
			} else {
				resolve(info)
			}
		})
	})
}

function getIllustsInternal (info) {
	return new Promise((resolve, reject) => {
		Pixiv.next().then(o => {
			o.illusts.map(e => info.illusts.push(e))

			if (Pixiv.hasNext()) {
				resolve(getIllustsInternal(info))
			} else {
				resolve(info)
			}
		})
	})
}

function getUser (args) {
	args.i.map(userId => {
		Pixiv.userDetail(userId).then(info => {
			let path = `${StoragePath}/${GetUserPath}/${info.user.id}-${info.user.name}/`
			if (!fs.existsSync(path)) { fs.mkdirSync(path) }

			getIllusts(userId).then(illustInfo => {
				console.log(`Fetch IllustInfo [${info.user.name}] = ${illustInfo.illusts.length}`)

				// sort by from old to new
				illustInfo.illusts = illustInfo.illusts.reverse()

				let indexes = {}

				// dealing duplicated titles & title become empty string after sanitized
				illustInfo.illusts.map(ele => {
					ele.title = sanitize(ele.title)

					let shallRename = ele.title.length === 0 || illustInfo.illusts.filter(ele2 => ele2.title.length > 0 && ele.title === sanitize(ele2.title)).length > 1

					if (shallRename) {
						if (indexes[ele.title] === undefined) {
							indexes[ele.title] = 0

							if (ele.title.length === 0) {
								ele.title = '_' + indexes[ele.title]
							}
						} else {
							indexes[ele.title] = indexes[ele.title] + 1
							ele.title = ele.title + '_' + indexes[ele.title]
						}
					}
				})

				illustInfo.illusts.map(ele => {
					if (ele.metaPages.length === 0) {
						let url = ele.metaSinglePage.originalImageUrl
						let mime = url.substring(url.length - 4)
						let filename = `${path}${ele.title}${mime}`
						if (!fs.existsSync(filename)) { getPixivImage(url, filename) }
					} else {
						let dir = `${path}${ele.title}`
						if (!fs.existsSync(dir)) { fs.mkdirSync(dir) }
						ele.metaPages.map((ele2, index) => {
							let url = ele2.imageUrls.original
							let mime = url.substring(url.length - 4)
							let filename = `${dir}/${ele.title}_p${index}${mime}`
							if (!fs.existsSync(filename)) { getPixivImage(url, filename) }
						})
					}
				})
			})
		})
	})
}

function getPixivImage (url, filename) {
	PixivImg(url, filename).then(output => console.log(`Stored: ${output}`))
}
