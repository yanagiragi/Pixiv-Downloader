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
	} else {
		
		if (mode === 'user') {
			if (typeof args.i !== 'object') {
				args.i = [ args.i ]
			}
			
			let yr = new yrPixiv(UsrAccount, UsrPassword, UsrFilter)
			
			args.i.map(id => yr.GetUser(id))
		}
	}
}