const fs = require('fs-extra')
const request = require('request')
const sanitize = require('sanitize-filename')
const Pixiv = require('pixiv-app-api')
const PixivImg = require('pixiv-img')

const { DateFormat, Config } = require('./Config')

class yrPixiv {
	constructor(configs){

		let { Account, Password, Filter, StoragePath="../Storage", GetUserPath="getUser", GetPagePath="getPage", FollowPath="getFollow", DailyPath="getDaily", DailyAmount=50, PixivIDCachePath } = configs

		this.Pixiv = new Pixiv(Account, Password)
		this.StoragePath = StoragePath
		this.GetUserPath = GetUserPath
		this.GetPagePath = GetPagePath
		this.FollowPath = FollowPath
		this.DailyPath = DailyPath
		this.UserFilter = Filter
		this.DailyAmount = DailyAmount
		this.Config = configs

		this.Config = configs

		this.accessToken = ''
		this.selfId = ''

		this.PixivIDCachePath = PixivIDCachePath
		try {
			this.PixivIDCache = JSON.parse(fs.readFileSync(this.PixivIDCachePath))
		}
		catch (error) {
			throw new Error(`Error Pasring PixivIDCachePath : ${this.PixivIDCachePath}`)
			return
		}
		
		fs.ensureDirSync(this.StoragePath)
		fs.ensureDirSync(`${this.StoragePath}/${this.GetUserPath}`)
		fs.ensureDirSync(`${this.StoragePath}/${this.DailyPath}`)
		fs.ensureDirSync(`${this.StoragePath}/${this.GetPagePath}`)
		fs.ensureDirSync(`${this.StoragePath}/${this.FollowPath}`)
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

	GetNextInternal (
		info, 
		earlyBreak=Boolean, 
		middleWareFunc= o => o.illusts.map(e => info.illusts.push(e))
	) {
		return new Promise((resolve, reject) => {
			this.Pixiv.next().then(o => {
				
				middleWareFunc(o)
				
				if (earlyBreak(info) && this.Pixiv.hasNext()) {
					resolve(this.GetNextInternal(info, earlyBreak, middleWareFunc))
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

	GetUserStoragePath(userInfo, overrideStoragePath='') {
		let userId = userInfo.user.id
		let username = sanitize(userInfo.user.name)
		let path = `${this.StoragePath}/${this.GetUserPath}/${userId}-${username}/`
		let overridePath = `${overrideStoragePath}/${userId}-${username}/`
		return overrideStoragePath.length > 0 ? overridePath : path
	}

	GetUser (userId, overrideStoragePath='') {
		this.Pixiv.userDetail(userId).then(info => {
			
			let path = this.GetUserStoragePath(info, overrideStoragePath)
			
			fs.ensureDirSync(path)

			this.GetUserIllusts(userId).then(illustInfo => {
				// console.log(`Fetch IllustInfo [${info.user.name}] = ${illustInfo.illusts.length}`)

				// Store path into illustInfo
				illustInfo.path = path

				// sort by from old to new
				illustInfo.illusts = illustInfo.illusts.reverse()				

				// dealing duplicated titles & title become empty string after sanitized
				this.SanitizeIllustInfo(illustInfo)				

				// get Url for each illust and call download function
				this.DealIllustInfo(illustInfo)
			})
		}).catch(err => console.log('fetch user error', err))
	}

	GetIllustDaily(info, earlyBreak=Boolean) {
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
			illustInfo.illusts = illustInfo.illusts.splice(0, this.DailyAmount)

			// Pixiv's Ranking is the ranking in two days ago
			let date = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
			let path = `${this.StoragePath}/${this.DailyPath}/${DateFormat(date)}/`

			fs.ensureDirSync(path)

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

	GetSearch(query, info, earlyBreak=Boolean){
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
		
		fs.ensureDirSync(path)
		
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
		PixivImg(url, filename).then(output => console.log(`Stored: ${output}`)).catch(err => console.log(err))
	}

	GetFollow(info, id, earlyBreak=Boolean){
		return new Promise((resolve, reject) => {
			this.Pixiv.userFollowing(id).then(o => {
				o.userPreviews.map(e => info.userPreviews.push(e))
				if (this.Pixiv.hasNext()) {
					resolve(
						this.GetNextInternal(
							info, 
							earlyBreak, 
							o => o.userPreviews.map(e => info.userPreviews.push(e))
						).catch(err => console.log(err.stack))
					)
				} else {
					resolve(info)
				}
			}).catch(err => {
				console.log(`fetch following info error: ${id}, this may occur sometimes`)
				// console.log(`raw data`, err)
				//resolve({})
			})
		})
	}

	GetSelfId() {
		return new Promise((resolve, reject) => {
			// need refactor
			this.Pixiv.login(this.Pixiv.username, this.Pixiv.password).then(userInfo => {
				this.selfId = userInfo.user.id
				this.accessToken = userInfo.access_token
				resolve()
			})
		})
	}

	GetFollowing() {
		// need refactor
		this.GetSelfId()
			.then( () => this.GetFollow({userPreviews: []}, this.selfId))
			.then(userFollowingInfo => {
				userFollowingInfo.userPreviews.map(userInfo => this.GetUser(userInfo.user.id, `${this.StoragePath}/${this.FollowPath}/`))
			})
	}

	AddFollow(id) {
		// Pixiv-App-Api Not Work, use native way from upbit/pixivpy
		request({
			method: 'POST',
			url: 'https://public-api.secure.pixiv.net/v1/me/favorite-users.json',
			headers : {
				'Referer': 'http://spapi.pixiv.net/',
				'User-Agent': 'PixivIOSApp/5.8.7',
				'Authorization': `Bearer ${this.accessToken}`
			},
			form : {
				'target_user_id': id,
				'publicity': 'public'
			}
		}, (err, res, body) => {
			console.log(`Follow ${id}.`)
		})
	}

	CopyFollowing(acc, pwd){
		let SourceConfig = Object.assign({...this.Config, Account: acc, Password: pwd})
		let SourcePixiv = new yrPixiv(SourceConfig)
		Promise.all([this.GetSelfId(), SourcePixiv.GetSelfId()])
			.then(() => SourcePixiv.GetFollow({userPreviews: []}, SourcePixiv.selfId))
			.then(sourceUserInfo => {
				let sourceUserFollowingIds = sourceUserInfo.userPreviews.reduce((acc, ele) => acc.concat(ele.user.id), [])

				this.GetFollow({userPreviews: []}, this.selfId).then(UserInfo => {
					let userFollowingIds = UserInfo.userPreviews.reduce((acc, ele) => acc.concat(ele.user.id), [])
					sourceUserFollowingIds
						.filter(userId => userFollowingIds.indexOf(userId) === -1)
						.map(userId => this.AddFollow(userId))
				})
			})
	}
}

module.exports.yrPixiv = yrPixiv
