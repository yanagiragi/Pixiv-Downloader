var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var dateFormat = require('dateformat');
var pixiv = require('pixiv.js');
var pixivImg = require('pixiv-img');
const querystring = require('querystring');
const readline = require('readline');

var data = require('./data.js');
const pix = data.getPixiv();

var storeindex;

start();

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
				} else {
					console.log(err);
					
				}
			});
		} else {
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
					main(illustid);
				}
			});
		}
	});
}

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

function main(illustid){

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
	return;
}

