const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request');
const dateFormat = require('dateformat');
const querystring = require('querystring');
const readline = require('readline');
const data = require('./data.js');

const pix = data.getPixiv();
const max = 9999;
var storeindex;

start();

function start(){
	if(process.argv.length == 2){		
		const rl = readline.createInterface(process.stdin, process.stdout);
		rl.setPrompt('Site: ');
		rl.prompt();

		rl.on('line', (line) => {
			preprocess(line.trim());
			rl.close();
		}).on('close', () => {
		  
		});
	}
	else{
		preprocess(process.argv[2]);
	}
}

function preprocess(pageUrl){
	
	var pagedir = pageUrl.substring(pageUrl.lastIndexOf('id=')+3,pageUrl.length);
	
	pix.users(pagedir).then(res => {
		storeindex = __dirname + "/Storage/getUser/" + res.response[0].name + '/';	
		fs.stat(storeindex , function(err, stats) {
			//Check if error defined and the error code is "not exists"
			if (err) {
			  //Create the directory, call the callback.
				fs.mkdir(storeindex , '0777', err => {
					if(!err){
						console.log('Create Dir Done.');
						process.chdir(storeindex);
						postprocess(pagedir);
					} else {
						console.log(err);
					}
				});
			} else {
			  console.log('dir ' + storeindex + ' exists! using it ...');
			  process.chdir(storeindex);
			  postprocess(pagedir);
			}
		});
	});
}

function postprocess(pagedir){
	
	var opts = querystring.stringify({ 'pages': 1, 'per_page': max });
	
	pix.userWorks(pagedir,opts).then(res => {
		for( var i in res.response ){
			data.fetchImg(res.response[i].id);
		}
	});
}