/*
*	this code tried to use pixiv.js for getting pixiv_daily
*	however there may be an issue:
*	see https://github.com/akameco/pixiv/issues/8 for more explains
*/

const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request');
const dateFormat = require('dateformat');
const data = require('./data.js');

const max = 50;
var storeindex;
var storeindexPostfix = '';
var mode = 'daily';
var filter = data.getFilter();

start();

function start(){
	preprocess();
}

function preprocess(){
	var day = dateFormat(new Date(), "yyyy-mm-dd");
	
	if(process.argv.length == 3 || process.argv.length == 4){
		if(process.argv.length == 4){
			mode = process.argv[2];
			day = process.argv[3];
			storeindexPostfix = mode + '/';
		} else if(process.argv.length ==3){
			mode = process.argv[2];
			storeindexPostfix = mode + '/';
		}
	}
	else{
		console.log('using default date...');
	}
	
	storeindex = __dirname + '/Storage/' + day + '/';

	fs.stat(storeindex  , function(err, stats) {
		//Check if error defined and the error code is "not exists"
		if (err) {
		  //Create the directory, call the callback.
			console.log('creating dir "' + 'Storage/' + day + '"...');
			fs.mkdir(storeindex , '0777', err => {
				if(!err){
					if(mode == 'daily'){
						console.log('Create Dir Done.');
						process.chdir(storeindex);
						main(day);
					}
					else{
						storeindex += storeindexPostfix;
						fs.mkdir(storeindex , '0777', err => {
							if(!err){
								console.log('Create Dir Done.');
								process.chdir(storeindex);
								main(day);
							} else {
								console.log(err);
							}
						});
					}
				} else {
					console.log(err);
				}
			});
		} 
		else {
			if(mode == 'daily'){
				console.log('dir ' + storeindex + ' exists! using it ...');
				process.chdir(storeindex);
				main(day);
			}
			else{
				storeindex += storeindexPostfix;
				fs.stat(storeindex  , function(err, stats) {
					if(err){
						fs.mkdir(storeindex , '0777', err => {
							if(!err){
								console.log('Create Dir Done.');
								process.chdir(storeindex);
								main(day);
							} else {
								console.log(err);
							}				
						});
					}
					else{
						console.log('dir ' + storeindex + ' exists! using it ...');
						process.chdir(storeindex);
						main(day);
					}
				});
			}
		}
	});
}

function main(daily){
	console.log('fetching day: ' + daily);
	var processedDate = daily;
	const pix = data.getPixiv();
	pix.ranking('all'
		,{ mode : mode }
		/*,{ date : processedDate }*/ // this part may cause error
	).then( res => {
		
		var len = (res.response[0].works.length > max ) ? max : res.response[0].works.length;
		if(len == 0){
			console.log("Api not ready...We are Sorry");
			process.exit();
		}
		for(var a=0; a < len; ++a){
			var illustid = res.response[0].works[a].work.id;
			if(!trymatch(res.response[0].works[a].work.tags)){
				data.fetchImg(illustid, storeindex);
			}
		}
	});
	return;
}

function trymatch(tags){
	for(var a = 0 ; a < tags.length; ++a){
		for(var b = 0 ; b < filter.length; ++b){
			if(tags[a].toLowerCase().indexOf(filter[b]) != -1)
				return true;
		}
	}
	return false;
}