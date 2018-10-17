const dateformat = require('dateformat')
const { spawn } = require('child_process')
const node = require('./data').getNodePath()
const remote = new (require('./yrPixiv'))('','',[]).StoragePath

let date = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toString()

console.log('start pipeline on fetching ' + date + '...')

var tasks = [
	{ exec : node , params : ['main.js','-m', 'daily'] },
	{ exec : node , params : ['compress.js', date] },
	
	/*{ exec : 'mv' , params : ['./Storage/_Compress/' + date + '.tar', remote] },
	{ exec : node , params : ['uploadGoogle.js', remote + date + '.tar'] },
	// cleanup
	{ exec : 'rm' , params : ['-rf', './Storage/' + date ] },
	{ exec : 'rm' , params : ['-f', remote + date + '.tar'] }*/
]

function StartTasks(now){
	
	if(now >= tasks.length) 
		process.exit()

	let ls = spawn(tasks[now].exec, tasks[now].params)
	ls.on('close', (code) => {
		console.log('process ' + now + ' done with code ' + code)
		StartTasks(now + 1)
	})

	ls.stderr.on('data', (data) => {
		console.log(data.toString())
	})
}

if(require.name === module){
	StartTasks(0)
}