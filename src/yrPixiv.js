const PixivImg = require('pixiv-img')
const fs = require('fs')
const sanitize = require('sanitize-filename')
const Pixiv = require('Pixiv-app-api')

class yrPixiv {
	constructor(acc, pwd, filt){
		this.Pixiv = new Pixiv(acc, pwd)
		this.StoragePath = '../Storage'
		this.GetUserPath = 'getUser'
		this.userFilter = filt

		if (!fs.existsSync(this.StoragePath)) 
			fs.mkdirSync(this.StoragePath)
		
		if (!fs.existsSync(`${this.StoragePath}/${this.GetUserPath}`)) 
			fs.mkdirSync(`${this.StoragePath}/${this.GetUserPath}`)

	}
    
	GetIllusts (userid) {
		return new Promise((resolve, reject) => {
			let info = { 'illusts': [] }

			this.Pixiv.userIllusts(userid).then(o => {
				o.illusts.map(e => info.illusts.push(e))

				if (this.Pixiv.hasNext()) {
					resolve(this.GetIllustsInternal(info))
				} else {
					resolve(info)
				}
			})
		})
	}

	GetIllustsInternal (info) {
		return new Promise((resolve, reject) => {
			this.Pixiv.next().then(o => {
				o.illusts.map(e => info.illusts.push(e))

				if (this.Pixiv.hasNext()) {
					resolve(this.GetIllustsInternal(info))
				} else {
					resolve(info)
				}
			})
		})
	}

	SanitizeIllustInfo(illustInfo) {
		// dealing duplicated titles & title become empty string after sanitized
				
		let indexes = {}		
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

		return illustInfo
	}

	DealIllustInfo(illustInfo)
	{
		// get Url for each illust and call download function
		illustInfo.illusts.map(ele => {
			// single pic in single illust
			if (ele.metaPages.length === 0) {
				let url = ele.metaSinglePage.originalImageUrl
				let mime = url.substring(url.length - 4)
				let filename = `${illustInfo.path}${ele.title}${mime}`
				
				if (!fs.existsSync(filename)) { 
					this.GetPixivImage(url, filename) 
				}
			} 
			// many pictures in single illust
			else {
				
				let dir = `${illustInfo.path}${ele.title}`
				
				if (!fs.existsSync(dir)) { fs.mkdirSync(dir) }
				
				ele.metaPages.map((ele2, index) => {								
					let url = ele2.imageUrls.original
					let mime = url.substring(url.length - 4)
					let filename = `${dir}/${ele.title}_p${index}${mime}`
					
					if (!fs.existsSync(filename)) { 
						this.GetPixivImage(url, filename) 
					}
				})
			}
		})
	}

	GetUser (userId) {
		this.Pixiv.userDetail(userId).then(info => {
			let path = `${this.StoragePath}/${this.GetUserPath}/${info.user.id}-${info.user.name}/`
			if (!fs.existsSync(path)) { fs.mkdirSync(path) }

			this.GetIllusts(userId).then(illustInfo => {
				console.log(`Fetch IllustInfo [${info.user.name}] = ${illustInfo.illusts.length}`)

				// Store path into illustInfo
				illustInfo.path = path

				// sort by from old to new
				illustInfo.illusts = illustInfo.illusts.reverse()				

				// dealing duplicated titles & title become empty string after sanitized
				this.SanitizeIllustInfo(illustInfo)				

				// get Url for each illust and call download function
				this.DealIllustInfo(illustInfo)
			})
		})	
	}

	GetPixivImage (url, filename) {
		PixivImg(url, filename).then(output => console.log(`Stored: ${output}`))
	}
}

module.exports = yrPixiv