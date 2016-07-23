var fs = require('fs');
var dateFormat = require('dateformat');
var tar = require('tar');
var fstream = require('fstream');


compress();

function compress(){
	
	var day = dateFormat(new Date(), "yyyymmdd");
	var storeindex = __dirname + '/Storage/' + day + '/';
	var tarindex = '../_Compress/' + day + '.tar';
	
	process.chdir(storeindex);
	console.log("Compressing " + storeindex + "...");
	

	var dirDest = fs.createWriteStream(tarindex);

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
}

