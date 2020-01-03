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
		this.PixivIDCache = []

		if(!fs.existsSync(this.PixivIDCachePath)){
			console.log(`Error Pasring PixivIDCachePath : ${this.PixivIDCachePath}, Create One.`)
			fs.writeJsonSync(this.PixivIDCachePath, [])
		}
		else {
			this.PixivIDCache = JSON.parse(fs.readFileSync(this.PixivIDCachePath))
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
	
	async GetUserIllustsSync (userid, info = { 'illusts': [] }) {
		const currentInfo = await this.Pixiv.userIllusts(userid)
		currentInfo.illusts.map(e => info.illusts.push(e))

		while (this.Pixiv.hasNext()) {
			const nextInfo = await this.Pixiv.next()
			nextInfo.illusts.map(e => info.illusts.push(e))
		}

		return info
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
	
	async DealIllustInfoSync(illustInfo)
	{
		// get Url for each illust and call download function
		for (const ele of illustInfo.illusts) {
			// single pic in single illust
			if (ele.metaPages.length === 0) {
				let url = ele.metaSinglePage.originalImageUrl
				let mime = url.substring(url.length - 4)
				let filename = `${illustInfo.path}${ele.title}${mime}`
				
				if (!fs.existsSync(filename)) { 
					await this.GetPixivImageSync(url, filename)
				}
			} 
			// many pictures in single illust
			else {
				
				let dir = `${illustInfo.path}${ele.title}`
				
				if (!fs.existsSync(dir)) { fs.mkdirSync(dir) }
				
				for(let index = 0; index < ele.metaPages.length; ++index) {
					const ele2 = ele.metaPages[index]
					let url = ele2.imageUrls.original
					let mime = url.substring(url.length - 4)
					let filename = `${dir}/${ele.title}_p${index}${mime}`
					
					if (!fs.existsSync(filename)) { 
						await this.GetPixivImageSync(url, filename) 
					}
				}
			}
		}
	}

	SavePixivCache() {
		console.log(`Save ${this.PixivIDCachePath}.`)
		fs.writeJsonSync(this.PixivIDCachePath, this.PixivIDCache, {spaces: '\t'})
	}

	GetUserStoragePath(userInfo, overrideStoragePath='') {
		let userId = userInfo.user.id
		let username = sanitize(userInfo.user.name)

		let pathPrefix = overrideStoragePath.length > 0 ? `${overrideStoragePath}` : `${this.StoragePath}/${this.GetUserPath}`

		let matched = this.PixivIDCache.find(x => x.id == userId)
		if (matched){
			let matchedName = sanitize(matched.name)
			if (username !== matchedName) {
				// username has changed
				console.log(`Detect new username ${username} for ${matchedName}, rename directory.`)
				
				matched.name = username
				
				let originalPath = `${pathPrefix}/${userId}-${matchedName}/`
				let newPath = `${pathPrefix}/${userId}-${username}/`

				if(fs.existsSync(originalPath))
					fs.moveSync(originalPath, newPath, {overwrite: true})
				else
					console.log(`${originalPath} does not exists, create ${newPath} instead.`)
			}
		}
		else {
			console.log(`Add ${userId}-${username} to PixivIDCache`)
			this.PixivIDCache.push({'id': userId, 'name': username})
		}

		let path = `${pathPrefix}/${userId}-${username}/`
		return path
	}

	GetUser (userId, overrideStoragePath='') {
		return new Promise((resolve, reject) => {
			this.Pixiv.userDetail(userId)
				.then(info => {
					let path = this.GetUserStoragePath(info, overrideStoragePath)
					fs.ensureDirSync(path)
					this.GetUserIllusts(userId)
						.then(illustInfo => {
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
						.then(() => resolve())
						.catch(err => console.log('fetch user error', err))
				})
				.catch(err => console.log('fetch user error', err))
		})
	}
	
	async GetUserSync (userId, overrideStoragePath='', username='') {
		
		const placeholder = { user: { id: userId, name: username } }
		const info = username == '' ? await this.Pixiv.userDetail(userId) : placeholder

		if (username == '') {
			console.log('pop')
		}
		
		let path = this.GetUserStoragePath(info, overrideStoragePath)
		fs.ensureDirSync(path)
		
		const illustInfo = await this.GetUserIllustsSync(userId)

		// Store path into illustInfo
		illustInfo.path = path
		
		// sort by from old to new
		illustInfo.illusts = illustInfo.illusts.reverse()
		
		// dealing duplicated titles & title become empty string after sanitized
		this.SanitizeIllustInfo(illustInfo)
		
		// get Url for each illust and call download function
		await this.DealIllustInfoSync(illustInfo)
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
		PixivImg(url, filename)
			.then(output => console.log(`Stored: ${output}`))
			.catch(err => console.log(`Error when Saving ${url}, error = ${err}`))
	}
	
	async GetPixivImageSync (url, filename) {
		const output = await PixivImg(url, filename)
		console.log(`Stored: ${output}`)
	}

	GetFollow(info, id, earlyBreak=Boolean){
		return new Promise((resolve, reject) => {
			this.Pixiv.userFollowing(id).then(o => {
				o.userPreviews.map(e => info.userPreviews.push(e))
				if (this.Pixiv.hasNext()) {
					let getNext = this.GetNextInternal(
							info, 
							earlyBreak, 
							o => o.userPreviews.map(e => info.userPreviews.push(e))
						)
					resolve(getNext)
				} else {
					resolve(info)
				}
			}).catch(err => {
				console.log(`fetch following info error: ${id}, this may occur sometimes`)
			})
		})
	}
	
	async GetFollowSync(info, id, earlyBreak=Boolean){
		try {
			const currentInfo = await this.Pixiv.userFollowing(id)
			currentInfo.userPreviews.map(e => info.userPreviews.push(e))
	
			while (this.Pixiv.hasNext()) {
				const nextInfo = await this.Pixiv.next()
				nextInfo.userPreviews.map(e => info.userPreviews.push(e))
			}
		} catch (err) {
			console.log(`fetch following info error: ${id}, this may occur sometimes`)
		}

		return info
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
		this.GetSelfId()
			.then( () => this.GetFollow({userPreviews: []}, this.selfId) )
			.then(userFollowingInfo => {
				let tasks = userFollowingInfo.userPreviews.reduce((acc, ele) => {
					return acc.concat(this.GetUser(ele.user.id, `${this.StoragePath}/${this.FollowPath}/`))
				},[])
				Promise.all(tasks).then(res => {
					this.SavePixivCache()
				})
			})
			.catch( err => {
				console.log(`GetFollowing Error, err = ${err}`)
				this.SavePixivCache()
			})
	}
	
	async GetFollowingSync() {
		
		function shuffle(sourceArray) {
			for (var i = 0; i < sourceArray.length - 1; i++) {
				var j = i + Math.floor(Math.random() * (sourceArray.length - i));
				var temp = sourceArray[j];
				sourceArray[j] = sourceArray[i];
				sourceArray[i] = temp;
			}
			return sourceArray;
		}
		
		// Preforms Login
		const selfId = await this.GetSelfId()

		let userFollowingInfo = { userPreviews: [] }
	
		let previousErr = []
		if (fs.existsSync('err.json')) {
			previousErr = JSON.parse(fs.readFileSync('err.json'))
		}

		if (previousErr.length > 0) {
			console.log(`Recovery Mode, Left = ${previousErr.length}`)
		}
		else {
			userFollowingInfo = await this.GetFollowSync({userPreviews: []}, this.selfId)
		}

		const userPreviews = previousErr.length > 0 ? previousErr : userFollowingInfo.userPreviews

		let errUsers = []

		for (const userPreview of shuffle(userPreviews)) {
			const id = userPreview.user.id
			const name = userPreview.user.name
			const savePath = `${this.StoragePath}/${this.FollowPath}/`
			try {
				const result = await this.GetUserSync(id, savePath, name)
				console.log('Done ', name)
			} catch (err) {
				console.log(`Failed On ${id} ${name}, ${err}`)
				errUsers.push(userPreview)
			}
		}
		
		fs.writeFileSync('err.json', JSON.stringify(errUsers, null, 4))

		this.SavePixivCache()
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
