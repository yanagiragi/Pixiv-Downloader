const minimist = require('minimist')
const yrPixiv = require('./yrPixiv')
const UsrData = require('./data')
const UsrAccount = UsrData.getAccount()
const UsrPassword = UsrData.getPassword()
const UsrFilter = UsrData.getFilter()

if (require.main === module) {
	let args = minimist(process.argv.slice(2))
	let mode = args.m // mode

	if (!mode) {
		console.log('please define option')
		process.exit()
	} 

	let yr = new yrPixiv(UsrAccount, UsrPassword, UsrFilter)

	if (mode === 'user') {
		if (typeof args.i !== 'object')
			args.i = [ args.i ] // userId
		
		args.i.map(id => yr.GetUser(id))		
	}
	
	if(mode === 'daily') {
		yr.GetDaily()
	}
	
	if(mode === 'page') {
		if (typeof args.p !== 'object') 
			args.p = [ args.p ] // pageUrl
		
		args.p.map(pageUrl => yr.GetSearchPage(pageUrl))
	}
	
	if(mode === 'follow') {
		yr.GetFollowing()
	}

	if(mode === 'migrate') {
		// no argv support cause you shouldn't leave your info in console history
		let account = 'abc'
		let password = 'abc'
		if(account === 'abc' && password === 'abc'){
			console.log('You Should Type Your Account/Password in main.js')
		}
		else{
			yr.CopyFollowing(account, password)
		}
	}
}
