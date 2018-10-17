var fs = require('fs')
var readline = require('readline')
var google = require('googleapis')
var googleAuth = require('google-auth-library')
const readChunk = require('read-chunk')
const fileType = require('file-type')

// If modifying these scopes, devare your previously saved credentials
// at ~/.credentials/drive-nodejs-quickstart.json
const SCOPES = ['https://www.googleapis.com/auth/drive.file']
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/'
const TOKEN_PATH = TOKEN_DIR + 'drive-nodejs-quickstart.json'

const _parentFoldersId = ['YOUR_FOLDER_ID'] 
var _filename = ''

if(typeof process.argv[2] !== 'undefined'){
	_filename = process.argv[2]

	// Load client secrets from a local file.
	fs.readFile('_auth/client_secret.json', function processClientSecrets(err, content) {
		if (err) {
			console.log('Error loading client secret file: ' + err)
			return
		}
		// Authorize a client with the loaded credentials, then call the
		// Drive API.
		authorize(JSON.parse(content), uploadFile)
	})
}
else{
	console.log('usage : node uploadGoogle.js $filename_with_no_paths')
}


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
	var clientSecret = credentials.installed.client_secret
	var clientId = credentials.installed.client_id
	var redirectUrl = credentials.installed.redirect_uris[0]
	var auth = new googleAuth()
	var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)

	// Check if we have previously stored a token.
	fs.readFile(TOKEN_PATH, function(err, token) {
		if (err) {
			getNewToken(oauth2Client, callback)
		} else {
			oauth2Client.credentials = JSON.parse(token)
			callback(oauth2Client, _filename)
		}
	})
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
	var authUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES
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
			storeToken(token)
			callback(oauth2Client)
		})
	})
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
	try {
		fs.mkdirSync(TOKEN_DIR)
	} catch (err) {
		if (err.code != 'EEXIST') {
			throw err
		}
	}
	fs.writeFile(TOKEN_PATH, JSON.stringify(token))
	console.log(JSON.stringify(token))
	console.log('Token stored to ' + TOKEN_PATH)
}

/**
 * upload a file to google drive, filepath: inside the folder in _parentFoldersId.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {filename} filename to upload.
 */
function uploadFile(auth, filename) {
	var service = google.drive({ version : 'v3', auth: auth})
	var buffer = readChunk.sync(__dirname + '/' + filename, 0, 4100)
	var mimeTypeOfbuffer = fileType(buffer)
	if(mimeTypeOfbuffer) mimeTypeOfbuffer = mimeTypeOfbuffer.mime  
	else mimeTypeOfbuffer = 'text/plain'
	var temp = filename.split('/')
	var storeName = temp[temp.length - 1]

	service.files.create({
		resource: {
			mimeType: mimeTypeOfbuffer,
			name: storeName,
			parents : _parentFoldersId
		},
		media: {
			mimeType: mimeTypeOfbuffer,
			body: fs.createReadStream(filename)
		}
	}, (err,response) => { 
    
		if(!err){
			// if not sharing
			//changePermissions(service, auth, response.id);  
		}
		else {
			console.log(err)
		}
    
	})
  
}

function changePermissions(service, auth, fileId){
	service.permissions.create({
		fileId : fileId,
		permissionId : auth.clientId_,
		resource : {
			role : 'reader',
			type : 'anyone'
		}
	},(err,response) => { 
		if(!err){
			getAlternativeLink(service, auth, fileId)
		}
		else{
			console.log(err)
		}
	})
}

function getAlternativeLink(service, auth, fileId){
	service.files.get({
		fileId : fileId,
		fields : 'webViewLink, id'
	}, (err,response) => {
		console.log(response)
	})
}
