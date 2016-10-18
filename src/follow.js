const querystring = require('querystring');
const data = require('./data.js');
const sanitize = require('sanitize-filename');
const gracefulFs = require('graceful-fs')
const fs = gracefulFs.gracefulify(require('fs'));

const max = 9999;
const pix = data.getPixiv();
var storeindex = __dirname + "/Storage/getFollow";

start();

function start(){
	console.log("Cool Start...");
	process.chdir(storeindex);
	pix.following().then(res => {
		if(res.status == "success"){
			for(var stat = 0 ; stat < parseInt(res.count); stat++){
				
				var id = res.response[stat].id;
				var name = sanitize(res.response[stat].name);
				
				if(!fs.existsSync(storeindex+"/"+name))
					fs.mkdir(storeindex+"/"+name,function(err){
						if(!err)
							preprocess("http://www.pixiv.net/member_illust.php?id="+id,storeindex+"/"+name+"/");
						else{
							console.log(err);
						}
					});
				else
					preprocess("http://www.pixiv.net/member_illust.php?id="+id,storeindex+"/"+name+"/");
			}
			console.log("Warm Sleep, See U Tomorrow...");
		}
	});
}

function preprocess(pageUrl,storeindex){
	var pagedir = pageUrl.substring(pageUrl.lastIndexOf('id=')+3,pageUrl.length);	
	pix.users(pagedir).then(res => {
		process.chdir(storeindex);
		postprocess(pagedir,storeindex);
	});
}

function postprocess(pagedir,storeindex){
	var opts = querystring.stringify({ 'pages': 1, 'per_page': max });
	pix.userWorks(pagedir,opts).then(res => {
		for( var i in res.response ){			
			data.fetchImg(res.response[i].id,storeindex);
		}
	});
}
