#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')
const minimist = require('minimist')
const sanitize = require('sanitize-filename')

const args = minimist(process.argv.slice(2))
const sessionId = args.i
const settingPath = args.s
const cachePath = args.c

const StoragePath = path.join(__dirname, 'Storage')

function EnsureDirExist(folder)
{
	if (!fs.existsSync(folder)) {
		fs.mkdirSync(folder)
	}
}

/**
 * Return Promise when pixiv image download completes
 * @return {string} output - saved path of the image
 * @param {string} url 
 * @param {string} filename 
 */
 async function GetPixivImage (url, storePath, filename) {
	try {
		EnsureDirExist(storePath)
		const savePath = path.join(storePath, filename)
		if (fs.existsSync(savePath)) {
			return true
		}
		const response = await fetch(url, { 
			encoding : 'binary',
			headers: { 
				 'Referer': 'http://www.pixiv.net/'
			}, 
			timeout: 1000 * 100 
		})
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

async function FetchFromPixiv(url) 
{
	return fetch(url, {
		'headers' : {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:87.0) Gecko/20100101 Firefox/87.0',
			'Accept': 'application/json' ,
			'Referer': 'https://www.pixiv.net/',
			'Pragma': 'no-cache',
			'Cookie': `PHPSESSID=${sessionId}`
		}
	})
}

async function GetImageUrlAndTitle(illustId) 
{
	try {
		const resp = await FetchFromPixiv(`https://www.pixiv.net/artworks/${illustId}`)
		const data = await resp.text()
		const raw = data.match(/id="meta-preload-data" content='(.*)'>/)
		const json = JSON.parse(raw[1])
		const src = json?.illust[illustId]?.urls?.original
		const title = json?.illust[illustId]?.title
		const filename = src.match(/\d+_p/)[0]
		const prefix = src.substring(0, src.indexOf(filename) + filename.length)
		const postfix = src.substring(src.indexOf(filename) + filename.length + 1, src.length)
		return [sanitize(title), [prefix, postfix]]
	} catch (err) {
		console.log(err)
		return [null, null];
	}
}

async function DealUserIllusts(setting, caches) {
	const cache = [...caches]
	const id = setting.id
	const name = setting.name

	const saveFolderPath = path.join(StoragePath, name)
	EnsureDirExist(StoragePath)
	EnsureDirExist(saveFolderPath)
	
	const resp = await FetchFromPixiv(`https://www.pixiv.net/ajax/user/${id}/profile/all?lang=ja`)
	const data = await resp.json()
	const illustIds = Object.entries(data?.body?.illusts).map(el => el[0])

	for(let i = 0; i < illustIds.length; ++i) {
		const illustId = illustIds[i]
		if (cache.includes(illustId)) {
			continue
		}

		const [title, [prefix, postfix]] = await GetImageUrlAndTitle(illustId)
		if (title == null) {
			console.log(`Error when fetching ${illustId}. Skipped`)
			continue
		}

		console.log(`Downloading ${i+1}/${illustIds.length}: ${illustId}`)
		
		let count = 0, canDonwload = true;
		do {
			canDonwload = await GetPixivImage(`${prefix}${count}${postfix}`, path.join(saveFolderPath, title), `${illustId} - ${count}${postfix}`)
			count += 1
		} while (canDonwload)

		cache.push(illustId)
	}

	return cache
}

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
