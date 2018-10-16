const fs = require('fs')
const request = require('request')
const cheerio = require('cheerio')
const sanitize = require('sanitize-filename')
const Pixiv = require('Pixiv-app-api')
const PixivImg = require('pixiv-img')


class yrPixiv {
	constructor(acc, pwd, filt){
		this.Pixiv = new Pixiv(acc, pwd)
		this.StoragePath = '../Storage'
		this.GetUserPath = 'getUser'
		this.GetPagePath = 'getPage'
		this.DailyPath = '.'
		this.UserFilter = filt
		this.DailyAmount = 50
		
		if (!fs.existsSync(this.StoragePath)) 
			fs.mkdirSync(this.StoragePath)
		
		if (!fs.existsSync(`${this.StoragePath}/${this.GetUserPath}`)) 
			fs.mkdirSync(`${this.StoragePath}/${this.GetUserPath}`)

		if (!fs.existsSync(`${this.StoragePath}/${this.GetPagePath}`)) 
			fs.mkdirSync(`${this.StoragePath}/${this.GetPagePath}`)

	}

	GetIllust(illustId) {
		return new Promise((resolve, reject) => {
			resolve(this.Pixiv.illustDetail(illustId))
		})
	}
    
	GetUserIllusts (userid, info = { 'illusts': [] }) {
		return new Promise((resolve, reject) => {
			this.Pixiv.userIllusts(userid).then(o => {
				o.illusts.map(e => info.illusts.push(e))

				if (this.Pixiv.hasNext()) {
					resolve(this.GetNextInternal(info))
				} else {
					resolve(info)
				}
			})
		})
	}

	GetNextInternal (info, earlyBreak=Boolean) {
		return new Promise((resolve, reject) => {
			this.Pixiv.next().then(o => {
				o.illusts.map(e => info.illusts.push(e))

				if (earlyBreak(info) && this.Pixiv.hasNext()) {
					resolve(this.GetNextInternal(info, earlyBreak))
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

			this.GetUserIllusts(userId).then(illustInfo => {
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

	GetIllustDaily(info, earlyBreak) {
		return new Promise((resolve, reject) => {
			this.Pixiv.illustRanking().then(o => {
				o.illusts.map(e => info.illusts.push(e))

				if (this.Pixiv.hasNext()) {
					resolve(this.GetNextInternal(info, earlyBreak))
				} else {
					resolve(info)
				}
			})
		})
	}

	GetDaily() {
		let earlyBreak = (illustInfo) => { return illustInfo.illusts.length <  this.DailyAmount }
		this.GetIllustDaily({ 'illusts': [] }, earlyBreak).then(illustInfo => {
			// return top 500 illusts
			// instead we slice to amount we need
			console.log(illustInfo.illusts.length)
			illustInfo.illusts = illustInfo.illusts.splice(0, this.DailyAmount)

			// Pixiv's Ranking is the ranking in two days ago
			let date = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toLocaleString()
			let path = `${this.StoragePath}/${this.DailyPath}/${date.substring(0, date.indexOf(' ') - 1)}/`
			if (!fs.existsSync(path)) { fs.mkdirSync(path) }

			// Store path into illustInfo
			illustInfo.path = path

			// sort by from old to new
			illustInfo.illusts = illustInfo.illusts.reverse()				

			// dealing duplicated titles & title become empty string after sanitized
			this.SanitizeIllustInfo(illustInfo)				

			// get Url for each illust and call download function
			this.DealIllustInfo(illustInfo)
		})
	}

	GetSearch(query, info, earlyBreak){
		return new Promise((resolve, reject) => {
			this.Pixiv.searchIllust(query).then(o => {
				o.illusts.map(e => info.illusts.push(e))
	
				if (this.Pixiv.hasNext()) {
					resolve(this.GetNextInternal(info, earlyBreak))
				} else {
					resolve(info)
				}
			})
		})
	}

	GetSearchPage(url)
	{
		// convert https://www.pixiv.net/search.php?word=%E9%BB%92%E3%82%BF%E3%82%A4%E3%83%84&order=date_d&p=4 to
		// { word: '%E9%BB%92%E3%82%BF%E3%82%A4%E3%83%84', order: 'date_d', p: '4' }
		let queryObject = {}
		let query = url.substring(url.indexOf('?') + 1)
			.split('&')
			.map(e => e.split('='))
			.map(e => queryObject[e[0]] = e[1])

		// reuse variable
		query = decodeURIComponent(queryObject.word)
		let pageIndex = isNaN(parseInt(queryObject.p)) ? 1 : parseInt(queryObject.p)
		let path = `${this.StoragePath}/${this.GetPagePath}/${query}_${pageIndex}/`
		
		if(!fs.existsSync(path))
			fs.mkdirSync(path)
		
		// pixiv show 40 search results per page
		let earlyBreak = (illustInfo) => { return illustInfo.illusts.length <  40 * pageIndex }
		
		this.GetSearch(query, {'illusts': [] }, earlyBreak).then(illustInfo => {
			
			// splice the result to exactly the amount we need
			illustInfo.illusts = illustInfo.illusts.splice(40 * (pageIndex - 1), 40)
			
			this.SanitizeIllustInfo(illustInfo)

			illustInfo.path = path
			
			// get Url for each illust and call download function
			this.DealIllustInfo(illustInfo)
		})
	}

	GetPixivImage (url, filename) {
		PixivImg(url, filename).then(output => console.log(`Stored: ${output}`))
	}
}

module.exports = yrPixiv