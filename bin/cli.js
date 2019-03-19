#!/usr/bin/env node

const minimist = require('minimist')
const { Config, yrPixiv } = require('..')
const { Pipeline, UploadGoogle } = require('./Pipeline')

const config = new Config( { ConfigPath: process.env.HOME + '/.yrPixiv/yrPixiv.config.json' } )

if (require.main === module) {

	process.chdir(config.WorkingDirectory)

	let args = minimist(process.argv.slice(2))
	let mode = args.m // mode

	if (!mode) {
		console.log('please define option')
		process.exit()
	} 

	let yr = new yrPixiv(config)

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
			yr.CopyFollowing(acc, pwd, filter)
		}
	}

	if(mode === 'pipeline') {
		new Pipeline(yr).Run()
	}

	if(mode === 'upload') {
		if (typeof args.f !== 'object')
			args.f = [ args.f ] // filepath
		
		args.f.map(filepath => new UploadGoogle(filepath, config).Run())
	}
}
