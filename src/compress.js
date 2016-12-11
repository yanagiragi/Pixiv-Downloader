var fs = require('fs');
var dateFormat = require('dateformat');
var tar = require('tar');
var fstream = require('fstream');
const exec = require('child_process').exec;

compress();

function compress(){
	
	//var day = dateFormat(new Date(), "yyyymmdd");
	var day = (typeof process.argv[2] != "undefined")?process.argv[2]:dateFormat(new Date(), "yyyy-mm-dd");	// for date.pixiv.js
	
	var storeindex = __dirname + '/Storage/' + day + '/';
	var tarindex = '../_Compress/' + day + '.tar';
	
	process.chdir(storeindex);

	var proc = exec('tar -cf ' + tarindex + ' *');
	proc.on('close', (code) => {
		console.log('tar done with return code ' + code);
	});
	/*var dirDest = fs.createWriteStream(tarindex);

	function onError(err) {
		  console.error('An error occurred:', err)
	}
	
	function onEnd() {
		console.log('Packed!')
	}
	
	var packer = tar.Pack({ noProprietary: true })
		.on('error', onError)
	    .on('end', onEnd);
		
	// This must be a "directory"
	fstream.Reader({ path: storeindex, type: "Directory" })
	    .on('error', onError)
        .pipe(packer)
        .pipe(dirDest);
    */
}

