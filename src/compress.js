const fs = require('fs')
const yrPixivInstance = new (require('./yrPixiv'))('','',[])
const StoragePath = `${yrPixivInstance.StoragePath}/${yrPixivInstance.DailyPath}/`
const { exec } = require('child_process')

if(require.main === module){
	if(process.argv.length != 3){
		console.log('node compress.js yyyy-mm-dd')
		process.exitCode = 1
		process.exit()
	}
	else{
		compress()
	}
}

function compress(){
	
	let date = process.argv[2]
	let targetPath = `${__dirname}/${StoragePath}/${date}/`
	let targetCompressPath = `${__dirname}/${StoragePath}/_Compress/${date}.tar`

	if(!fs.existsSync(`${__dirname}/${StoragePath}/_Compress/`))
		fs.mkdirSync(`${__dirname}/${StoragePath}/_Compress/`)
	
	process.chdir(targetPath)

	let proc = exec('tar -cvf ' + targetCompressPath + ' .')

	proc.on('close', (code) => {
		console.log('tar done with return code ' + code)
	})
}
