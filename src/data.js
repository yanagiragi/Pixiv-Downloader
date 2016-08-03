const pixiv = require('pixiv.js');
const pixivImg = require('pixiv-img');
const fs = require('fs');

module.exports.getPixiv = function(){
	return new pixiv('your_account','your_password');
}
module.exports.getRemoteStorage = function(){
	return "your_remote_storage";
}
module.exports.getFilter = function(){
	return ['bl','腐向け'];
}
module.exports.fetchImg = function (illustid,storeindex) {
	
	const pix = this.getPixiv();

	pix.works(illustid).then(res => {
		if(res.status == "success"){
			var title = res.response[0].title;
			var author = res.response[0].user.name; 
			var large = res.response[0].image_urls.large;
			var page = res.response[0].page_count;
						
			var prefix = large.substring(0,large.lastIndexOf('_p0')+2);
			var postfix = large.substring(large.lastIndexOf('_p0')+3,large.length);
			
			if(page > 1){
				var storeindex2 = storeindex + title + '/';
				fs.mkdir(storeindex2,'0777', err => {
					if(err){
						console.log(err);
					}else{
						var nowindex = storeindex2;
						for( var i = 0; i < page; ++i){
							var largename = prefix + i + postfix;
							pixivImg(largename).then( output => {

								var filename = title + '_' + author + '_' + output;
								filename = nowindex + filename.replace('/','\\').replace(' ','_');
								
								fs.rename(output,filename,function(err){
									if(err){
										console.log(err);
										fs.rename(output,nowindex+output,function(err){
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
				})
			} else{
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
		}
	});
	return;
}
