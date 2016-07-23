const spawn = require('child_process').spawn;
var dateformat = require('dateformat');

var remote = require('./data.js').getRemoteStorage();

const ls = spawn('../node_modules/.bin/babel-node', ['--harmony' ,'../src/date.js']);

ls.stdout.on('data', (data) => {
	  console.log(`${data}`);
});

ls.stderr.on('data', (data) => {
	  console.log(`stderr: ${data}`);
});

ls.on('close', (code) => {
	
	console.log(`child process exited with code ${code}`);
	
	const ls2 = spawn('../node_modules/.bin/babel-node', ['--harmony' ,'../src/compress.js']);
	ls2.stdout.on('data', (data) => {
	  console.log(`${data}`);
	});

	ls2.stderr.on('data', (data) => {
		  console.log(`stderr: ${data}`);
	});
	
	ls2.on('close', (code) => {
		
		console.log(`child process exited with code ${code}`);
		const ls3 = spawn('scp', 
			[ '../src/Storage/_Compress/' + dateformat(new Date(),"yyyymmdd") + '.tar',
			remote
			]
		);
		ls3.on('close', (code) => {
			console.log('Done.');
			process.exit();
		});
	});
});

