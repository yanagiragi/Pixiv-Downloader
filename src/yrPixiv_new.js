const fs = require('fs-extra')
const request = require('request')
const sanitize = require('sanitize-filename')
const Pixiv = require('pixiv-app-api')
const path = require('path')

const utils = require('./utils')
const Illusts = require('./Illusts')
const Follow = require('./Follow')

const { DateFormat, Config } = require('./Config')

class yrPixiv_New {

	constructor(configs){
        
        let { Account, Password, Filter, StoragePath="../Storage", GetUserPath="getUser", GetPagePath="getPage", FollowPath="getFollow", DailyPath="getDaily", DailyAmount=50, PixivIDCachePath } = configs

        this.Config = configs

		this.Pixiv = new Pixiv(Account, Password)
		this.StoragePath = StoragePath
		this.GetUserPath = GetUserPath
		this.GetPagePath = GetPagePath
		this.FollowPath = FollowPath
		this.DailyPath = DailyPath
		this.UserFilter = Filter
        this.DailyAmount = DailyAmount
        
        // need refactor
        this.restorePath = path.join(StoragePath, 'err.json')
        this.restoreTasks = []

        if (fs.existsSync(this.restorePath)) {
            this.restoreTasks = JSON.parse(fs.readFileSync(this.restorePath))
        }
		
		this.accessToken = ''
		this.selfId = ''

		this.PixivIDCachePath = PixivIDCachePath
		this.PixivIDCache = []

		if(!fs.existsSync(this.PixivIDCachePath)){
			console.log(`Error Parsing PixivIDCachePath: ${this.PixivIDCachePath}, Create One.`)
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

    async Login() {
        const userInfo = await this.Pixiv.login(this.Pixiv.username, this.Pixiv.password)
        this.selfId = userInfo.user.id
		this.accessToken = userInfo.access_token
    }

    SavePixivCache() {
        return utils.SavePixivCache(this)
    }
    
    async GetFollowing() {		
        
        await this.Login()
        
        if (this.restoreTasks.length > 0) {
            console.log(this.restorePath)
			console.log(`Recovery Mode, Left = ${this.restoreTasks.length}`)
        }
        
        const savePath = path.join(this.StoragePath, this.FollowPath)
        const errUsers = []                
		const userPreviews = this.restoreTasks.length > 0 ? this.restoreTasks : await Follow.GetFollowingInfo(this)
        const shuffle = function (sourceArray) {
			for (var i = 0; i < sourceArray.length - 1; i++) {
				var j = i + Math.floor(Math.random() * (sourceArray.length - i));
				var temp = sourceArray[j];
				sourceArray[j] = sourceArray[i];
				sourceArray[i] = temp;
			}
			return sourceArray;
		}
        
        const tasks = []

		for (const user of shuffle(userPreviews)) {
			try {
                const result = await this.GetUser_Impl(user, savePath)
			} catch (err) {
				console.log(`Failed On ${user.id}-${user.name}, ${err}`)
				if (err.toString() != 'HTTPError: Response code 404 (Not Found)') { // avoid loop when picture return 404
					errUsers.push(user)
				}
			}
		}        
        
        console.log('Save Err ',this.restorePath)
        fs.writeFileSync(this.restorePath, JSON.stringify(errUsers, null, 4))
        
		this.SavePixivCache()
    }
    
    async GetUser_Impl (userInfo, overrideStoragePath='') {

        const GetUserStoragePath = utils.GetUserStoragePath(this, userInfo, overrideStoragePath)
        fs.ensureDirSync(GetUserStoragePath)
		
        const illustInfo = await Illusts.GetUserIllustsInfo(this, userInfo)
        console.log(`Get ${userInfo.id}-${userInfo.name} IllustInfo Done`)

		// Store path into illustInfo
		illustInfo.storePath = GetUserStoragePath
		
		// sort by from old to new
        illustInfo.illusts = illustInfo.illusts.reverse()		
        
        const illustsDownloadInfo = Illusts.GetIllustsDownloadInfo(this, illustInfo)
        
        const downloadableInfo = illustsDownloadInfo.filter(downloadInfo => {
            const savePath = path.join(downloadInfo.savePath, downloadInfo.filename)
            return !fs.existsSync(savePath)                
        })

        console.log(`${userInfo.id}-${userInfo.name} user downloadable: ${downloadableInfo.length}`)

        const tasks = downloadableInfo.map(downloadInfo => {
            console.log(downloadInfo.filename)
            const saveFolderPath = downloadInfo.savePath
            fs.ensureDirSync(saveFolderPath)
            const savePath = path.join(downloadInfo.savePath, downloadInfo.filename)
            return utils.GetPixivImage(downloadInfo.url, savePath)
        })
        
		return Promise.all(tasks)
    }
    
    async GetUser (userId) {
        const userName = await utils.GetUserIllustName(this, userId)
        return this.GetUser_Impl({ 'id': userId, 'name': userName })
	}
	
    async GetDaily() {

		await this.Login()

		const dailyIllustsInfo = await Illusts.GetDailyIllustsInfo(this)
		console.log('Fetch Daily Info Done.')
		
		// dailyIllustsInfo returns top 500 illusts
		// instead we slice to amount we need
		dailyIllustsInfo.illusts = dailyIllustsInfo.illusts.splice(0, this.DailyAmount)

		// Pixiv's Ranking is the ranking in two days ago
		const date = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
		const storePath = path.join(this.StoragePath, this.DailyPath, DateFormat(date))
		fs.ensureDirSync(storePath)

		// Store path into illustInfo
		dailyIllustsInfo.storePath = storePath

		// sort by from old to new
		dailyIllustsInfo.illusts = dailyIllustsInfo.illusts.reverse()				

		const dailyIllustsDownloadInfo = Illusts.GetIllustsDownloadInfo(this, dailyIllustsInfo)

        const downloadableInfo = dailyIllustsDownloadInfo.filter(downloadInfo => {
            const savePath = path.join(downloadInfo.savePath, downloadInfo.filename)
            return !fs.existsSync(savePath)                
        })

        console.log(`Daily ${DateFormat(date)} downloadable: ${downloadableInfo.length}`)

        const tasks = downloadableInfo.map(downloadInfo => {
            const saveFolderPath = downloadInfo.savePath
            fs.ensureDirSync(saveFolderPath)
            const savePath = path.join(downloadInfo.savePath, downloadInfo.filename)
            return utils.GetPixivImage(downloadInfo.url, savePath)
        })
        
		const output = await Promise.all(tasks)
		console.log('Done')		
		return output
	}

    // ======================================================    
    
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

module.exports = yrPixiv_New