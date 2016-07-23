const pixiv = require('pixiv.js');

module.exports.getPixiv = function(){
	return new pixiv('your_account','your_password');
}
module.exports.getRemoteStorage = function(){
	return "hc102u@csie0.cs.ccu.edu.tw:~/WWW/Storage";
}
