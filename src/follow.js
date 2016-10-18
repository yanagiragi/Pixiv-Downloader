const fs = require('graceful-fs')
const querystring = require('querystring');
const data = require('./data.js');

const pix = data.getPixiv();
const max = 9999;

var storeindex = __dirname + "/Storage/getFollow";

start();

function start(){
	process.chdir(storeindex);
	pix.following().then(res => {
		if(res.status == "success"){
			for(var stat in res.response){
				let id = res.response[stat].id;
				let name = res.response[stat].name;
				
				if(!fs.existsSync(storeindex+"/"+name))
					fs.mkdirSync(storeindex+"/"+name);
				
				preprocess("http://www.pixiv.net/member_illust.php?id="+id,storeindex+"/"+name+"/");
			}
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
