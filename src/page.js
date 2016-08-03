const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request');
const dateFormat = require('dateformat');
const querystring = require('querystring');
const readline = require('readline');
const data = require('./data.js');

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
	
	var pagedir = pageUrl.substring(pageUrl.indexOf('?')+1,pageUrl.length);	
	var ans = querystring.parse(pagedir, null, null);
	pagedir = ans.word;
	
	storeindex = __dirname + "/Storage/getPage/" + pagedir + '/';	
	
	fs.stat(storeindex , function(err, stats) {
		//Check if error defined and the error code is "not exists"
		if (err) {
		  	//Create the directory, call the callback.
			fs.mkdir(storeindex , '0777', err => {
				if(!err){
					console.log('Create Dir Done.');
					process.chdir(storeindex);
					postprocess(pageUrl);
				} 
				else {
					console.log(err);
				}
			});
		} 
		else {
		  console.log('dir ' + storeindex + ' exists! using it ...');
		  process.chdir(storeindex);
		  postprocess(pageUrl);
		}
	});
}

function postprocess(pageUrl){
	request(pageUrl,function(err,res,body){
		if(err || res.statusCode != "200"){
			console.log('err when fetching page!');
		} 
		else {
			var $ = cheerio.load(body);
			$('.image-item').each(function(){
				var str = $(this).children().attr('href');
				if(typeof(str) != "undefined"){
					var illustid = str.substring(str.indexOf('id=')+3,str.length);
					console.log('detect id: ' + illustid);
					data.fetchImg(illustid,storeindex);
				}
			});
		}
	});
}
