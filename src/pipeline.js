const spawn = require('child_process').spawn;
const dateformat = require('dateformat');
const remote = require('./data.js').getRemoteStorage();
const node = require('./data.js').getNodePath();

var date = '';

// temporaily omit : fetch specific day issues.
/*if(typeof process.argv[2] !== "undefined")
	date = process.argv[2] */

var tasks = [
	{ exec : node , params : (date == '') ? ['date.pixiv.js'] : ['date.pixiv.js','daily',date] },
	{ exec : node , params : (date == '') ? ['compress.js'] : ['compress.js', date] },
	{ exec : 'mv' , params : ['./Storage/_Compress/' + ( (date !== '') ? date : dateformat(new Date(),"yyyy-mm-dd") ) + '.tar', remote] },
	{ exec : node , params : ['uploadGoogle.js', remote + ( (date !== '') ? date : dateformat(new Date(),"yyyy-mm-dd") ) + '.tar'] },
	// cleanup
	{ exec : 'rm' , params : ['-rf', './Storage/' + ((date !== '') ? date : dateformat(new Date(),"yyyy-mm-dd")) ] },
	{ exec : 'rm' , params : ['-f', remote + ((date !== '') ? date : dateformat(new Date(),"yyyy-mm-dd")) + '.tar'] }
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
