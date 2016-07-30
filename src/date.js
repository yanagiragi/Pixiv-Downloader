const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request');
const dateFormat = require('dateformat');
const data = require('./data.js');
const tar = require('tar');
const fstream = require('fstream');

var storeindex;

start();

function start(){
	preprocess();
}

function preprocess(){
	var dailyH = "http://cdn-pixiv.lolita.tw/rankings/"
	var dailyT = "/pixiv_daily.json"
	var day = dateFormat(new Date(), "yyyymmdd");
	if(process.argv.length == 3){
		day = process.argv[2];
	}
	else{
		console.log('using default date...');
	}
	var daily = dailyH + day + dailyT;
	console.log('creating dir "' + 'Storage/' + day + '"...');
	
	storeindex = __dirname + '/Storage/' + day + '/';
	fs.stat(storeindex  , function(err, stats) {
		//Check if error defined and the error code is "not exists"
		if (err) {
		  //Create the directory, call the callback.
			fs.mkdir(storeindex , '0777', err => {
				if(!err){
					console.log('Create Dir Done.');
					process.chdir(storeindex);
					main(daily,'.');
				} else {
					console.log(err);
					
				}
			});
		} else {
		  console.log('dir ' + storeindex + ' exists! using it ...');
		  process.chdir(storeindex);
		  main(daily);
		}
	});
}

function main(daily){
	console.log("parsing history json data...");
	request(daily,function(err,res,body){
		console.log("fetched!");
		if(err)
			console.log('err = ' + err);
		else{
			try{
				var json = JSON.parse(body);
				/* you may change the limit , max_length = 500 */
				var length = 50 ; //json.length
				for( var a = 0 ; a < length ; ++a){
					var url = json[a].url;
					var illustid = url.substring(url.indexOf("_id=")+4,url.indexOf("&uarea"));
					
					data.fetchImg(illustid);
				}
			} catch(e){
				console.log('errs = ' + err);
			}
		}
	});
	return;
}