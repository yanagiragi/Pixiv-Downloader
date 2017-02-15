var fs = require('fs');
var dateFormat = require('dateformat');
const exec = require('child_process').exec;

compress();

function compress(){
	
	var day = (typeof process.argv[2] != "undefined")?process.argv[2]:dateFormat(new Date(), "yyyy-mm-dd");	// for date.pixiv.js
	
	var storeindex = __dirname + '/Storage/' + day + '/';
	var tarindex = '../_Compress/' + day + '.tar';
	
	process.chdir(storeindex);

	var proc = exec('tar -cf ' + tarindex + ' *');
	proc.on('close', (code) => {
		console.log('tar done with return code ' + code);
	});
}