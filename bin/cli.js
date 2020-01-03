#!/usr/bin/env node

const minimist = require('minimist')
const { Config, yrPixiv } = require('..')
const { Pipeline, UploadGoogle } = require('./pipeline')
const config = new Config( { ConfigPath: process.env.HOME + '/.yrPixiv/yrPixiv.config.json' } )

if (require.main === module) {

	process.on('unhandledRejection', (reason, p) => {
		console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
	// application specific logging, throwing an error, or other logic here
	})
		
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
		// yr.GetFollowing()
		(async () => {
			await yr.GetFollowingSync()
		})()
	}

	if(mode === 'migrate') {
		let account = process.env.PIXIV_ACCOUNT ||  'placeholder'
		let password = process.env.PIXIV_PASSWORD || 'placeholder'
		
		if(account === 'placeholder' || password === 'placeholder'){
			console.log('No Account/Password found in enviornment variables')
		}

		else{
			console.log(`Migrating ${account} to ${config.Account}`)
			yr.CopyFollowing(account, password)
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
