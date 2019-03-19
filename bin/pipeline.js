
const readline = require('readline')
const google = require('googleapis')
const googleAuth = require('google-auth-library')
const readChunk = require('read-chunk')
const fileType = require('file-type')
const fs = require('fs')
const { spawn } = require('child_process')

const { DateFormat } = require('..')

class Pipeline
{
	constructor(yrPixivInstance)
	{
		this.yrPixivInstance = yrPixivInstance
	}

	Run()
	{
		let date = DateFormat(new Date(Date.now() - 1000 * 60 * 60 * 24 * 2))
		let StoragePath = `${this.yrPixivInstance.StoragePath}/${this.yrPixivInstance.DailyPath}/${date}`
		let CompressPath = `${this.yrPixivInstance.StoragePath}/_Compress`

		if(!fs.existsSync(CompressPath)) { fs.mkdirSync(CompressPath); }

		const tasks = [
			// Fetch Pixiv Daily
			{ exec : 'node' , params : ['cli.js', '-m', 'daily'] },
			// Tar Pixiv Daily
			{ exec : 'tar' , params : [ '-cvf', `${CompressPath}/${date}.tar`, '-C', `${StoragePath}/`, '.']},
			// Upload Pixiv Daily to Google Drive
			{ exec : 'node' , params : ['cli.js', '-m', 'upload', '-f', `${CompressPath}/${date}.tar`] },
			// Clean Up
			{ exec : 'rm' , params : ['-rf', `${StoragePath}` ] },
			{ exec : 'rm' , params : ['-f', `${CompressPath}/${date}.tar`] }
		]
		
		function StartTasks(now){			
			if(now >= tasks.length) 
				process.exit()
			else
				console.log(tasks[now])

			let ls = spawn(tasks[now].exec, tasks[now].params)
			ls.on('close', (code) => {
				console.log('process ' + now + ' done with code ' + code)
				StartTasks(now + 1)
			})
		
			//ls.stdout.on('data', (data) => { console/log(data.toString()) })
		
			ls.stderr.on('data', (data) => {
				console.log(data.toString())
			})
		}

		StartTasks(0)
	}
}

// wrapper of old "uploadGoogle.js"
// written with lazy injection using .bind(this)
class UploadGoogle
{
	constructor(uploadFilePath, config)
	{
		let { 
			TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/', 
			TOKEN_PATH = 'drive-nodejs-quickstart.json',
		 	PARENT_FOLDERS_ID = [''],
			CILENTSECRET_PATH  = "_auth/client_secret.json"
		} = config

		this.SCOPES = ['https://www.googleapis.com/auth/drive.file']
		// If modifying these scopes, devare your previously saved credentials
		// at ~/.credentials/drive-nodejs-quickstart.json
		this.TOKEN_DIR = TOKEN_DIR
		this.TOKEN_PATH = this.TOKEN_DIR + TOKEN_PATH
		this.PARENT_FOLDERS_ID = PARENT_FOLDERS_ID
		this.CILENTSECRET_PATH = CILENTSECRET_PATH
		this._filename = uploadFilePath
	}
	
	// Main Entrance
	Run()
	{	
		// Load client secrets from a local file.
		fs.readFile(this.CILENTSECRET_PATH, function processClientSecrets(err, content) {
			if (err) {
				console.log('Error loading client secret file: ' + err)
				return
			}
			
			// Authorize a client with the loaded credentials, then call the
			// Drive API.
			this.authorize(JSON.parse(content), this.uploadFile.bind(this))			
		}.bind(this))
	}

	/**
	 * Create an OAuth2 client with the given credentials, and then execute the
	 * given callback function.
	 *
	 * @param {Object} credentials The authorization client credentials.
	 * @param {function} callback The callback to call with the authorized client.
	 */
	authorize(credentials, callback) 
	{
		var clientSecret = credentials.installed.client_secret
		var clientId = credentials.installed.client_id
		var redirectUrl = credentials.installed.redirect_uris[0]
		var auth = new googleAuth()
		var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)

		// Check if we have previously stored a token.
		fs.readFile(this.TOKEN_PATH, function(err, token) {
			if (err) {
				this.getNewToken(oauth2Client, callback)
			} else {
				oauth2Client.credentials = JSON.parse(token)
				callback(oauth2Client,this._filename)
			}
		}.bind(this))
	}

	/**
	 * Get and store new token after prompting for user authorization, and then
	 * execute the given callback with the authorized OAuth2 client.
	 *
	 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
	 * @param {getEventsCallback} callback The callback to call with the authorized
	 *     client.
	 */
	getNewToken(oauth2Client, callback) {
		var authUrl = oauth2Client.generateAuthUrl({
			access_type: 'offline',
			scope: this.SCOPES
		})
		console.log('Authorize this app by visiting this url: ', authUrl)
		var rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		})
		rl.question('Enter the code from that page here: ', function(code) {
			rl.close()
			oauth2Client.getToken(code, function(err, token) {
				if (err) {
					console.log('Error while trying to retrieve access token', err)
					return
				}
				oauth2Client.credentials = token
				this.storeToken(token)
				callback(oauth2Client)
			})
		})
	}

	/**
	 * Store token to disk be used in later program executions.
	 *
	 * @param {Object} token The token to store to disk.
	 */
	storeToken(token) {
		try {
			fs.mkdirSync(this.TOKEN_DIR)
		} catch (err) {
			if (err.code != 'EEXIST') {
				throw err
			}
		}
		fs.writeFile(this.TOKEN_PATH, JSON.stringify(token))
		console.log(JSON.stringify(token))
		console.log('Token stored to ' + this.TOKEN_PATH)
	}

	/**
	 * upload a file to google drive, filepath: inside the folder in _parentFoldersId.
	 *
	 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
	 * @param {filename} filename to upload.
	 */
	uploadFile(auth, filename) {
		let service = google.drive({ version : 'v3', auth: auth})
		let buffer = readChunk.sync(filename, 0, 4100)
		let mimeTypeOfbuffer = fileType(buffer) ? fileType(buffer).mime : 'text/plain'
		let temp = filename.split('/')
		let storeName = filename.indexOf('/') != -1 ? temp[temp.length - 1] : filename
		let PARENT_FOLDERS_ID = this.PARENT_FOLDERS_ID

		service.files.create({
			resource: {
				mimeType: mimeTypeOfbuffer,
				name: storeName,
				parents : PARENT_FOLDERS_ID
			},
			media: {
				mimeType: mimeTypeOfbuffer,
				body: fs.createReadStream(filename)
			}
		}, (err,response) => { 
			if(!err){
				// if not sharing
				//this.changePermissions(service, auth, response.id);  
			}
			else {
				console.log(err)
			}		
		})	
	}

	changePermissions(service, auth, fileId){
		service.permissions.create({
			fileId : fileId,
			permissionId : auth.clientId_,
			resource : {
				role : 'reader',
				type : 'anyone'
			}
		},(err,response) => { 
			if(!err){
				this.getAlternativeLink(service, auth, fileId)
			}
			else{
				console.log(err)
			}
		})
	}

	getAlternativeLink(service, auth, fileId){
		service.files.get({
			fileId : fileId,
			fields : 'webViewLink, id'
		}, (err,response) => {
			console.log(response)
		})
	}
}

exports.Pipeline = Pipeline
exports.UploadGoogle = UploadGoogle