#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'
import minimist from 'minimist'
import sanitize from 'sanitize-filename'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const args = minimist(process.argv.slice(2))
const sessionId = args.i
const settingPath = args.s ?? path.join(__dirname, 'data', 'setting.json')
const cachePath = args.c ?? path.join(__dirname, 'data', 'cache.json')
const corruptedPath = args.r ?? path.join(__dirname, 'data', 'corrupted.json')
const verbose = args.v === 'true'
const webhookUrl = args.w
const webhookToken = args.t

const StoragePath = path.join(__dirname, 'Storage')

/**
 * Create dir if not exists
 * @param {string} - folder path
 * @returns {Void}
 */
function EnsureDirExist (folder) {
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
async function FetchFromPixiv (url, option = {}) {
	return fetch(url, Object.assign(option, {
		'headers': {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:87.0) Gecko/20100101 Firefox/87.0',
			'Accept': 'application/json',
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
async function GetPixivImage (url, storePath, filename, illustId) {
	try {
		EnsureDirExist(storePath)
		const savePath = path.join(storePath, filename)
		/*if (fs.existsSync(savePath)) {
			if (verbose) console.log(`Skip ${savePath}`)
			return true
		}*/
		const response = await fetch(url, { encoding: 'binary', timeout: 1000 * 100, headers: { 'Referer': 'https://www.pixiv.net/' } })
		if (!response.ok) {
			console.log(`Unable to download ${illustId}, url = ${url}`)
			return false
		}

		const body = await response.buffer()
		fs.writeFileSync(savePath, body, 'binary')
		console.log(`Stored https://www.pixiv.net/artworks/${illustId} to ${savePath}`)

		if (webhookUrl) {
			const options = {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${webhookToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					url: url,
					message: `[Pixiv-Downloader] downloaded: https://www.pixiv.net/artworks/${illustId}`
				})
			}

			const resp = await fetch(webhookUrl, options)
			if (resp.ok) {
				console.log(`Successfully notify ${savePath} downloaded`)
			}
			else {
				const context = await resp.text()
				console.log(`Unable to notify. Response = ${context}`)
			}
		}


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
async function GetImageUrlAndTitle (illustId) {
	try {
		const resp = await FetchFromPixiv(`https://www.pixiv.net/ajax/illust/${illustId}?lang=ja`)
		const data = await resp.json()
		const title = data?.body?.illustTitle
		const url = data?.body?.urls?.original
		const prefix = url.substring(0, url.indexOf(illustId) + illustId.length + '_p'.length)
		const postfix = path.extname(url)
		return [sanitize(title), prefix, postfix]
	} catch (err) {
		console.log(err)
		return [null, null, null]
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
async function DealUserIllusts (setting, caches) {
	const cache = [...caches]
	const id = setting.id
	const name = setting.name

	try {
		const saveFolderPath = path.join(StoragePath, `${id}-${sanitize(name)}`)
		EnsureDirExist(StoragePath)
		EnsureDirExist(saveFolderPath)

		const resp = await FetchFromPixiv(`https://www.pixiv.net/ajax/user/${id}/profile/all?lang=ja`)
		const data = await resp.json()
		const illusts = data?.body?.illusts

		if (illusts == null) {
			console.log(`Detect error occurs when fetch illust of [${id}]: ${JSON.stringify(data, null, 4)}`)
			return cache
		}

		const illustIds = Object.entries(illusts).map(el => el[0])

		for (let i = 0; i < illustIds.length; ++i) {
			const illustId = illustIds[i]
			if (verbose) {
				console.log(`Checking [${id}-${name}]: ${i + 1}/${illustIds.length}: ${illustId}`)
			}

			if (cache.includes(illustId)) {
				if (verbose)
					console.log(`Skip ${illustId}`)
				continue
			}

			const [title, prefix, postfix] = await GetImageUrlAndTitle(illustId)
			if (title == null) {
				console.log(`Error when fetching ${illustId}. Skipped`)
				continue
			}

			console.log(`Downloading [${id}-${name}]: ${i + 1}/${illustIds.length}: ${illustId}`)

			let count = 0, canDonwload = true
			do {
				canDonwload = await GetPixivImage(`${prefix}${count}${postfix}`, path.join(saveFolderPath, `${illustId}-${title}`), `${illustId}-${count}${postfix}`, illustId)
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
async function Run () {
	try {
		const corrupted = JSON.parse(fs.readFileSync(corruptedPath)).map(x => x.substring(0, x.indexOf('-')))
		const settings = JSON.parse(fs.readFileSync(settingPath))
		let caches = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath)) : []
		let remainedCorrupted = corrupted.filter(x => !caches.includes(x))
		caches = caches.filter(x => !corrupted.includes(x))
		for (const setting of settings) {
			caches = await DealUserIllusts(setting, caches)
		}
		fs.writeFileSync(cachePath, JSON.stringify(caches, null, 4))
		fs.writeFileSync(corruptedPath, JSON.stringify(remainedCorrupted, null, 4))
	} catch (err) {
		console.log(err)
	}
}

console.log(`=====================================`)
console.log(`Session: ${sessionId}`)
console.log(`=====================================`)

if (sessionId == null) {
	console.log('Session cannot be null. Abort.')
}
else {
	Run()
}