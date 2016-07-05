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

const max = 9999;
var storeindex;

start();

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
	
	
	
	/*var ans = querystring.parse(pagedir, null, null);
	for(var a in ans){
		pagedir = a;
		break;
	}*/	
	//storeindex = __dirname + "/Storage/getPage/" + pagedir + '/';	
	
	
}

function postprocess(pagedir){
	
	var opts = querystring.stringify({ 'pages': 1, 'per_page': max });
	
	pix.userWorks(pagedir,opts).then(res => {
		//console.log(res.response[0].id);
		//console.log(JSON.stringify(res,null,4));
		//console.log(res.response.length);
		for( var i in res.response ){
			main(res.response[i].id);
		}
	});
}

function start(){
	if(process.argv.length == 2){		
		const rl = readline.createInterface(process.stdin, process.stdout);

		rl.setPrompt('Site: ');
		rl.prompt();

		rl.on('line', (line) => {
			//console.log(`Say what? I might have heard '${line.trim()}'`);
			preprocess(line.trim());
		}).on('close', () => {
		  console.log('Have a great day!');
		  process.exit(0);
		});
	}
	else{
		preprocess(process.argv[2]);
	}
	
	/*setInterval(function(){
		preprocess();
	},1000*60*60*24);*/
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
					//var filename = '"' + title + '_' + author + '_' + output + '"';
					filename = storeindex + filename.replace('/','.').replace(' ','_');
					fs.rename(output,filename,function(err){
						if(err){
							console.log(err);
							/*fs.rename(output,__dirname + "/Storage/getUser/" + 'Temporary' + '/' + output,function(err){
								if(err)
									console.log('rename failed.');
							})*/;
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

