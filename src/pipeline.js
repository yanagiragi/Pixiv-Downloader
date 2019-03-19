const { spawn } = require('child_process')
const node = require('./data').getNodePath()
const yrPixivInstance = new (require('./yrPixiv'))('','',[])
const StoragePath = `${yrPixivInstance.StoragePath}/${yrPixivInstance.DailyPath}/`

let date = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toLocaleString().replace(/\//g,'-')
date = date.substring(0, date.indexOf(' '))

var tasks = [
	{ exec : node , params : ['main.js','-m', 'daily'] },
	{ exec : node , params : ['compress.js', date] },
	{ exec : node , params : ['uploadGoogle.js', `${StoragePath}/_Compress/${date}.tar`] },
	// cleanup
	{ exec : 'rm' , params : ['-rf', `${StoragePath}/${date}` ] },
	{ exec : 'rm' , params : ['-f', `${StoragePath}/_Compress/${date}.tar`] }
]

function StartTasks(now){
	
	if(now >= tasks.length) 
		process.exit()

	let ls = spawn(tasks[now].exec, tasks[now].params)
	ls.on('close', (code) => {
		console.log('process ' + now + ' done with code ' + code)
		StartTasks(now + 1)
	})

	// ls.stdout.on('data', (data) => { console.log(data.toString()) })

	ls.stderr.on('data', (data) => {
		console.log(data.toString())
	})
}

if(require.main === module){
	console.log('start pipeline on fetching ' + date + '...')
	StartTasks(0)
}
