#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')
const minimist = require('minimist')
const sanitize = require('sanitize-filename')

const args = minimist(process.argv.slice(2))
const sessionId = args.i
const settingPath = args.s ?? 'setting.json'
const cachePath = args.c ?? 'cache.json'
const verbose = args.v === 'true'

const StoragePath = path.join(__dirname, 'Storage')

/**
 * Create dir if not exists
 * @param {string}} - folder path
 * @returns {Void}
 */
function EnsureDirExist(folder)
{
	if (!fs.existsSync(folder)) {
		fs.mkdirSync(folder)
	}
}

/**
 * Wrapper to fetch pixiv apis
 * @param {string} url - url of the pixiv api
 * @param {object} [option] - additional options
 * @returns {promise}
 */
async function FetchFromPixiv(url, option = {}) 
{
	return fetch(url, Object.assign(option, {
		'headers' : {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:87.0) Gecko/20100101 Firefox/87.0',
			'Accept': 'application/json' ,
			'Referer': 'https://www.pixiv.net/',
			'Pragma': 'no-cache',
			'Cookie': `PHPSESSID=${sessionId}`
		}
	}))
}

/**
 * Return Promise when pixiv image download completes
 * @param {string} url - url of the image to get
 * @param {string} storePath - folder path to be store the image
 * @param {string} filename - filename of the image to be stored
 * @returns {boolean} Is success or not. if skipped return true.
 */
async function GetPixivImage (url, storePath, filename) {
	try {
		EnsureDirExist(storePath)
		const savePath = path.join(storePath, filename)
		if (fs.existsSync(savePath)) {
			return true
		}
		const response = await fetch(url, { encoding : 'binary', timeout: 1000 * 100, headers: { 'Referer': 'https://www.pixiv.net/' } })
		if (!response.ok) return false
		const body = await response.buffer()
		fs.writeFileSync(savePath, body, 'binary')
		console.log(`Stored: ${savePath}`)
		return true
	} catch (error) {
		console.log(error)
		return false
	}	
}

/**
 * Return fetch results of the illustId
 * @param {string} illustId - id of the illust
 * @returns {[string, [string, string]]} [ title of the image, [ prefix of the url of the image, postfix of the url of the image ] ]
 */
async function GetImageUrlAndTitle(illustId) 
{
	try {
		const resp = await FetchFromPixiv(`https://www.pixiv.net/artworks/${illustId}`)
		const data = await resp.text()
		const raw = data.match(/id="meta-preload-data" content='(.*)'>/)
		const json = JSON.parse(raw[1])
		const src = json?.illust?.[illustId]?.urls?.original
		const title = json?.illust?.[illustId]?.title
		const filename = src.match(/\d+_[p|ugoira]/)[0]
		const prefix = src.substring(0, src.indexOf(filename) + filename.length)
		const postfix = src.substring(src.indexOf(filename) + filename.length + 1, src.length)
		return [sanitize(title), [prefix, postfix]]
	} catch (err) {
		console.log(err)
		return [null, null]
	}
}

/**
 * Downloads all image of a user
 * @param {Object} setting - data to be download
 * @param {Object} setting.id - id of the user, e.g. 2168501
 * @param {Object} setting.name - name of the user, e.g. のみや
 * @param {[Object]} caches - cache of the saved image to accerlate the download progress
 * @returns {[Object]} the updated cache
 */
async function DealUserIllusts(setting, caches) {
	const cache = [...caches]
	const id = setting.id
	const name = setting.name
	
	try {
		const saveFolderPath = path.join(StoragePath, `${id}-${sanitize(name)}`)
		EnsureDirExist(StoragePath)
		EnsureDirExist(saveFolderPath)
		
		const resp = await FetchFromPixiv(`https://www.pixiv.net/ajax/user/${id}/profile/all?lang=ja`)
		const data = await resp.json()
		const illustIds = Object.entries(data?.body?.illusts).map(el => el[0])

		for(let i = 0; i < illustIds.length; ++i) {
			const illustId = illustIds[i]
			if (verbose) {
				console.log(`Checking [${id}-${name}]: ${i+1}/${illustIds.length}: ${illustId}`)
			}

			if (cache.includes(illustId)) {
				if (verbose)
					console.log(`Skip ${illustId}`)
				continue
			}

			const [title, [prefix, postfix]] = await GetImageUrlAndTitle(illustId)
			if (title == null) {
				console.log(`Error when fetching ${illustId}. Skipped`)
				continue
			}
			
			console.log(`Downloading [${id}-${name}]: ${i+1}/${illustIds.length}: ${illustId}`)
			
			let count = 0, canDonwload = true
			do {
				canDonwload = await GetPixivImage(`${prefix}${count}${postfix}`, path.join(saveFolderPath, `${illustId}-${title}`), `${illustId}-${count}${postfix}`)
				count += 1
			} while (canDonwload)

			cache.push(illustId)
		}
	} catch (err) {
		console.log(err)
	}

	return cache
}

/**
 * Entrance of the program
 * @param {Void}
 * @returns {Void}
 */
async function Run() {	
	try {
		const settings = JSON.parse(fs.readFileSync(settingPath))
		let caches = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath)) : []
		for(const setting of settings) {
			caches = await DealUserIllusts(setting, caches)
		}
		fs.writeFileSync(cachePath, JSON.stringify(caches, null, 4))
	} catch (err) {
		console.log(err)
	}
}

if (require.main === module) {
	Run()
}
