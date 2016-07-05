var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var dateFormat = require('dateformat');
var pixiv = require('pixiv.js');
var pixivImg = require('pixiv-img');
var data = require('./data.js');

const pix = data.getPixiv();
var storeindex;

start();

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
		  main(daily,'.');
		}
	});
}

function start(){
	preprocess();
	/*setInterval(function(){
		preprocess();
	},1000*60*60*24);*/
}

function main(daily,day){
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
					
					pix.works(illustid).then(res => {
						if(res.status == "success"){
							var title = res.response[0].title;
							var author = res.response[0].user.name; 
							var large = res.response[0].image_urls.large;
							var page = res.response[0].page_count;
										
							var prefix = large.substring(0,large.lastIndexOf('_p0')+2);
							var postfix = large.substring(large.lastIndexOf('_p0')+3,large.length);
										
							for( var i = 0; i < page; ++i){
								var largename = prefix + i + postfix;
								pixivImg(largename).then( output => {
									var filename = title + '_' + author + '_' + output;
									filename = storeindex + filename.replace('/','\\').replace(' ','_');
									fs.rename(output,filename,function(err){
										if(err){
											console.log(err);
											fs.rename(output,storeindex+output,function(err){
												if(err)
													console.log('rename failed.');
											});
										}
										else
											console.log( filename +  " has stored.");
									});
								});
							}
						}
					});
				}
				/*var read = targz().createReadStream(storeindex.substring(0,storeindex.length-1));
				var write = fs.createWriteStream(day+'.tar.gz');
				read.pipe(write);*/
			} catch(e){
				console.log('errs = ' + err);
			}
		}
	});
	return;
}

