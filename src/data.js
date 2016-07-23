const pixiv = require('pixiv.js');

module.exports.getPixiv = function(){
	return new pixiv('your_account','your_password');
}
module.exports.getRemoteStorage = function(){
	return "your_remote_storage";
}
