//import { yrPixiv } from 'yrPixiv'

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
			args.i = [ args.i ]
		
		args.i.map(id => yr.GetUser(id))		
	}
	else if(mode === 'daily') {
		yr.GetDaily()
	}
	else if(mode === 'page') {
		if (typeof args.p !== 'object') 
			args.p = [ args.p ]
		args.p.map(pageUrl => yr.GetSearchPage(pageUrl))
	}
}