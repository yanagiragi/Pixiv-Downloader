const pixiv = require('pixiv.js');
const pixivImg = require('pixiv-img');
var gracefulFs = require('graceful-fs');
var fs = gracefulFs.gracefulify(require('fs'));


module.exports.getPixiv = function(){
	return new pixiv('your_account','your_password');
}
module.exports.getRemoteStorage = function(){
	return "your_remote_storage";
}
module.exports.getFilter = function(){
	return ['bl','腐向け'];
}
module.exports.getNodePath = function(){
	return 'your_node_excutive_path';
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

			// if picture is multiple
			if(page > 1){

				var storeindex2 = storeindex + title + '/';
				if(!fs.existsSync(storeindex2)){
					fs.mkdirSync(storeindex2);
				}

				for( var i = 0; i < page; ++i){
					// url of filename
					var largename = prefix + i + postfix;

					// filename we wish to save as
					var filename = title + '_' + author + '_' + largename.substring(largename.lastIndexOf("/")+1,largename.length);
					filename = storeindex2 + filename.replace('/','\\').replace(' ','_');

					if( !fs.existsSync(filename) ){
						pixivImg(largename).then( output => {

							// re-declare filename since "var filename" outside the scope has already changed
							var filename = title + '_' + author + '_' + output;
							filename = storeindex2 + filename.replace('/','\\').replace(' ','_');

							fs.rename(output,filename,function(err){
								if(err){
									console.log(err);
									fs.rename(output,storeindex2+output,function(err){
										if(err)
											console.log('rename failed.');
									});
								}
								else
									console.log( filename +  " has stored.");
							});
						});
					} else {
						console.log("[Skip] " + filename );
					}
				} // end of for

			}  // end of if( page > 1)
			else{

				for( var i = 0; i < page; ++i){
					// original filename
					var largename = prefix + i + postfix;

					// filename we wish to store
					var filename = title + '_' + author + '_' + largename.substring(largename.lastIndexOf("/")+1,largename.length);
					filename = filename.replace('/','\\').replace(' ','_');

					if(!fs.existsSync(filename)){
						pixivImg(largename).then( output => {

							// re-decalre variable to use it in scope
							var filename = title + '_' + author + '_' + output;
							filename = storeindex + filename.replace('/','\\').replace(' ','_');

							// rename downloaded picture
							fs.rename(output,filename,function(err){
								if(err){
									console.log(err);
									// if failed, simply move to folder without rename it
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
					else {
						console.log("[Skip] " + filename );
					}
				}
			}
		}
	});
	return;
}
