const pixiv = require('pixiv.js');

module.exports.getPixiv = function(){
	return new pixiv('your_Account','your_Password');
}