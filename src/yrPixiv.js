const fs = require('fs-extra')
const path = require('path')
const pMap = require('p-map')
const fetch = require('node-fetch')

//const Pixiv = require('pixiv-app-api')
const Pixiv = require('pixiv-api-client');

const utils = require('./utils')
const Illusts = require('./Illusts')
const Follow = require('./Follow')

class yrPixiv {

	constructor(config){        
		const { 
			Account, 
			Password, 
			StoragePath='Storage', 
			GetUserPath='User', 
			GetPagePath='Page',
			FollowPath='Follow',
			DailyPath='Daily', 
			DailyAmount=50,
			UseSync=false,
			UsePMap=true,
			PMapConcurrency=5,
			RestorePath=path.join(StoragePath, 'err.json'),
			PixivIDCachePath=path.join(StoragePath, 'PixivIDCache.json'),
			verbose=false
		} = config

		this.StoragePath = StoragePath
		this.GetUserPath = GetUserPath
		this.GetPagePath = GetPagePath
		this.FollowPath = FollowPath
		this.DailyPath = DailyPath
		this.DailyAmount = DailyAmount		
		this.useSync = UseSync
		this.usePMap = UsePMap
		this.pMapConcurrency = PMapConcurrency
		this.restorePath = RestorePath
		this.PixivIDCachePath = PixivIDCachePath
		this.verbose = verbose
		
		// backup config
		this.Config = config
		
		// setup pixiv-app-api instance
		this.Pixiv = new Pixiv()

		// updated after Login()
		this.accessToken = ''
		this.selfId = ''

		// load restore tasks
		this.restoreTasks = []
		if (fs.existsSync(this.restorePath)) {
			this.restoreTasks = JSON.parse(fs.readFileSync(this.restorePath))
		}		
		
		// load pixiv id caches
		this.PixivIDCache = []
		if(!fs.existsSync(this.PixivIDCachePath)){
			console.log(`Error Parsing PixivIDCachePath: ${this.PixivIDCachePath}, Create One.`)
			fs.writeJsonSync(this.PixivIDCachePath, [])
		} else {
			this.PixivIDCache = JSON.parse(fs.readFileSync(this.PixivIDCachePath))
		}
		
		// ensure path exists
		fs.ensureDirSync(this.StoragePath)
		fs.ensureDirSync(`${this.StoragePath}/${this.GetUserPath}`)
		fs.ensureDirSync(`${this.StoragePath}/${this.DailyPath}`)
		fs.ensureDirSync(`${this.StoragePath}/${this.GetPagePath}`)
		fs.ensureDirSync(`${this.StoragePath}/${this.FollowPath}`)
	}

	async Login() {
		const userInfo = await this.Pixiv.login(this.Config.Account, this.Config.Password)
		this.selfId = userInfo.user.id
		this.accessToken = userInfo.access_token
	}

	/**
	 * Save PixivIDCache in yrPixivInstance
	 */
	SavePixivIDCache() {
		if (this.verbose) {
			console.log(`Save ${this.PixivIDCachePath}.`)
		}
		fs.writeJsonSync(this.PixivIDCachePath, this.PixivIDCache, {spaces: '\t'})
	}

	async GetUser_Impl (userInfo, overrideStoragePath='') {

		const GetUserStoragePath = utils.GetUserStoragePath(this, userInfo, overrideStoragePath)
		fs.ensureDirSync(GetUserStoragePath)
		
		const illustInfo = await Illusts.GetUserIllustsInfo(this, userInfo)
        
		// Store path into illustInfo
		illustInfo.storePath = GetUserStoragePath
		
		// sort by from old to new
		illustInfo.illusts = illustInfo.illusts.reverse()		
		
		// parse illustInfo to download ready structure
		const illustsDownloadInfo = utils.ParseIllustsInfoToDownloadInfo(illustInfo)
		
		// filter needed downloadInfo
		const downloadableInfo = illustsDownloadInfo.filter(downloadInfo => {
			const savePath = path.join(downloadInfo.savePath, downloadInfo.filename)
			return !fs.existsSync(savePath)                
		})
		
		// ensure download path exists
		downloadableInfo.map(downloadInfo => {
			fs.ensureDirSync(downloadInfo.savePath)
		})
		
		if (this.verbose) {
			console.log(`Running ${userInfo.id}-${userInfo.name} user downloadable: ${downloadableInfo.length}`)
		}

		return this.DealIllustInfo(downloadableInfo)
	}    

	async DealIllustInfo(downloadableInfo) {
		if (this.useSync) {
			const errs = []
			for(const downloadInfo of downloadableInfo){
				try {
					await utils.GetPixivImage(downloadInfo.url, downloadInfo.savePath, downloadInfo.filename)
				} catch (e) {
					errs.push(e)
				}
			}
			if (errs.length > 0) {
				throw new Error(errs)
			}
		}
		else {
			if (this.usePMap) {
				const mapper = async downloadInfo => {
					return utils.GetPixivImage(downloadInfo.url, downloadInfo.savePath, downloadInfo.filename)
				}
				try {
					await pMap(downloadableInfo, mapper, { concurrency: this.pMapConcurrency, stopOnError: false })
				} catch (err) {
					// returns aggregate-error
					// ref: https://github.com/sindresorhus/aggregate-error
					throw new Error(err)
				}		        
			}
			else {
				const tasks = downloadableInfo.map(downloadInfo => {
					return utils.GetPixivImage(downloadInfo.url, downloadInfo.savePath, downloadInfo.filename)
				})
				const results = await Promise.all(tasks.map(p => p.catch(e => e)))
				const invalidResults = results.filter(result => result instanceof Error)
				if (invalidResults.length > 0) {
					throw new Error(invalidResults)
				}
			}
		}
	}
	
	// APIs for cli.js

	async GetFollowing() {		

		// Login since most API need Login
		await this.Login()
        
		if (this.restoreTasks.length > 0) {
			console.log(`Recovery Mode, Left = ${this.restoreTasks.length}`)
		}
        
		const savePath = path.join(this.StoragePath, this.FollowPath)
		const errUsers = []                
		const userPreviews = this.restoreTasks.length > 0 ? this.restoreTasks : await Follow.GetFollowingInfo(this)
		const shuffle = function (sourceArray) {
			for (var i = 0; i < sourceArray.length - 1; i++) {
				var j = i + Math.floor(Math.random() * (sourceArray.length - i))
				var temp = sourceArray[j]
				sourceArray[j] = sourceArray[i]
				sourceArray[i] = temp
			}
			return sourceArray
		}
        
		for (const userInfo of shuffle(userPreviews)) {
			try {
				const result = await this.GetUser_Impl(userInfo, savePath)
				if (this.verbose) {
					console.log(`Done Fetching User: ${userInfo.name}.`)
				}
			} catch (err) {
				if (this.verbose) {
					console.log(`Failed On ${userInfo.id}-${userInfo.name}, Error: ${JSON.stringify(err)}`)
				}
				if (err.toString() != 'HTTPError: Response code 404 (Not Found)') { // avoid loop when picture return 404
					errUsers.push(userInfo)
				}
			}
		}        
        
		if (errUsers.length > 0) {
			console.log(`Save Err[${errUsers.length}] Restore File to ${this.restorePath}`)
		}
		fs.writeFileSync(this.restorePath, JSON.stringify(errUsers, null, 4))
		
		// Update Pixiv ID Cache
		this.SavePixivIDCache()
	}
    
	async GetUser (userId) {

		// Login since most API need Login
		await this.Login()

		const userName = await utils.GetUserIllustName(this, userId)
		return this.GetUser_Impl({ 'id': userId, 'name': userName })
	}
	
	async GetDaily() {

		// Login since most API need Login
		await this.Login()

		const dailyIllustsInfo = await Illusts.GetDailyIllustsInfo(this)
		if (this.verbose) {
			console.log('Fetch Daily Info Done.')
		}
		
		// dailyIllustsInfo returns top 500 illusts
		// instead we slice to amount we need
		dailyIllustsInfo.illusts = dailyIllustsInfo.illusts.splice(0, this.DailyAmount)

		// Pixiv's Ranking is the ranking in two days ago
		const date = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
		const formattedDate = utils.DateFormat(date)
		const storePath = path.join(this.StoragePath, this.DailyPath, formattedDate)
		fs.ensureDirSync(storePath)

		// Store path into illustInfo
		dailyIllustsInfo.storePath = storePath

		// sort by from old to new
		dailyIllustsInfo.illusts = dailyIllustsInfo.illusts.reverse()				

		const dailyIllustsDownloadInfo = utils.ParseIllustsInfoToDownloadInfo(dailyIllustsInfo)

		const downloadableInfo = dailyIllustsDownloadInfo.filter(downloadInfo => {
			const savePath = path.join(downloadInfo.savePath, downloadInfo.filename)
			return !fs.existsSync(savePath)                
		})

		if (this.verbose) {
			console.log(`Daily ${formattedDate} downloadable: ${downloadableInfo.length}`)
		}

		return this.DealIllustInfo(downloadableInfo)
	}
    
	async GetSearchPage(url)
	{
		// Login since most API need Login
		await this.Login()
		
		// https://www.pixiv.net/tags/%E9%BB%92%E3%82%BF%E3%82%A4%E3%83%84/artworks?p=4
		if (this.verbose) {
			console.log(`Parsing Page: ${url}`)
		}
		const query = url.match(/\/tags\/(.*)\//)[1]
		const searchParams = new URLSearchParams(new URL(url).search)
		const pageIndex = searchParams.has('p') ? parseInt(searchParams.get('p')) : 1

		const storePath = path.join(this.StoragePath, this.GetPagePath, `${query}_${pageIndex}`)
		fs.ensureDirSync(storePath)

		const searchInfo = await Illusts.GetSearchIllustsInfo(this, query, pageIndex)

		searchInfo.storePath = storePath

		const searchDownloadInfo = utils.ParseIllustsInfoToDownloadInfo(searchInfo)
		
		const downloadableInfo = searchDownloadInfo.filter(downloadInfo => {
			const savePath = path.join(downloadInfo.savePath, downloadInfo.filename)
			return !fs.existsSync(savePath)                
		})
		
		if (this.verbose) {
			console.log(`Start Downloading Search Query = ${query}, Page = ${pageIndex}, Downloadable = ${downloadableInfo.length}`)
		}

		return this.DealIllustInfo(downloadableInfo)		
	}	

	async CopyFollowing(acc, pwd){		
		const sourceConfig = Object.assign({...this.Config, Account: acc, Password: pwd})
		const sourcePixiv = new yrPixiv(sourceConfig)

		// Login since most API need Login
		await this.Login()
		await sourcePixiv.Login()

		const sourceFollowingInfo = await Follow.GetFollowingInfo(sourcePixiv)
		const followingInfo = await Follow.GetFollowingInfo(this)
		const followingIds = followingInfo.map(x => x.id)
		const unfollowInfos = sourceFollowingInfo.filter(x => !followingIds.includes(x.id))

		if (this.verbose) {
			console.log(`Unfollow users: ${unfollowInfos.length}.`)
		}

		for(const userInfo of unfollowInfos) {
			const resp = await this.Pixiv.followUser(userInfo.id)
			console.log(`Follow ${userInfo.id}-${userInfo.name}.`)
		}
	}
}

module.exports = yrPixiv
