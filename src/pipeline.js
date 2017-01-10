const spawn = require('child_process').spawn;
const dateformat = require('dateformat');
const remote = require('./data.js').getRemoteStorage();
const node = require('./data.js').getNodePath();

var date = new Date();

// temporaily omit : fetch specific day issues.
if(typeof process.argv[2] !== "undefined")
	date = process.argv[2] 
else
	date = dateformat(date.setDate(date.getDate() - 2), "yyyy-mm-dd")

console.log('start pipeline on fetching ' + date + '...')

var tasks = [
	{ exec : node , params : ['date.pixiv.js','daily',date] },
	{ exec : node , params : ['compress.js', date] },
	{ exec : 'mv' , params : ['./Storage/_Compress/' + date + '.tar', remote] },
	{ exec : node , params : ['uploadGoogle.js', remote + date + '.tar'] },
	// cleanup
	{ exec : 'rm' , params : ['-rf', './Storage/' + date ] },
	{ exec : 'rm' , params : ['-f', remote + date + '.tar'] }
]

exec(0)

function exec(now){
	
	if(now >= tasks.length) process.exit();

	var ls = spawn(tasks[now].exec, tasks[now].params);
	ls.on('close', (code) => {
		console.log('process ' + now + ' done with code ' + code)
		exec(now + 1)
	});

	ls.stderr.on('data', (data) => {
		console.log(data.toString())
	})
}
