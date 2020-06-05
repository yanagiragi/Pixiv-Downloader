#!/usr/bin/env node

const minimist = require('minimist')
const { yrPixiv } = require('..')
const path = require('path')

async function Run() {

	const args = minimist(process.argv.slice(2))
	const mode = args.mode || args.m
	const isVerbose = args.verbose === 'true' || args.v === 'true' || false
	
	if (!mode) {
		console.log('Detect No mode! Please define option, e.g.')
		console.log('  node cli.js -m [ follow | daily | migrate ]')
		console.log('  node cli.js -m page [-p $uri]')
		console.log('  node cli.js -m user [-i $id]')
		process.exit()
	} 

	const sync = args.sync || false
	const pMap = args.pmap || true

	const config = {
		Account: process.env.PIXIV_ACCOUNT || 'placeholder'	,
		Password: process.env.PIXIV_PASSWORD || 'placeholder',
		StoragePath: path.join(__dirname, 'Storage'),
		PixivIDCachePath: path.join(__dirname, 'Storage', 'PixivId.json'),
		UseSync: sync,
		UsePMap: pMap,
		verbose: isVerbose
	}
	
	if (config.Account === 'placeholder' || config.Password === 'placeholder')
	{
		console.log('Detect No Account/Password!')
		console.log('Abort.')
		return
	}
													

	const yr = new yrPixiv(config)

	if (mode === 'user') {
		if (typeof args.i !== 'object') {
			args.i = [ args.i ] // userId
		}
		for(const id of args.i) {
			await yr.GetUser(id)
		}
	}

	else if(mode === 'daily') {
		await yr.GetDaily()
	}
	
	else if(mode === 'page') {
		if (typeof args.p !== 'object') {
			args.p = [ args.p ] // pageUrl		
		}
		for(const pageUrl of args.p) {
			await yr.GetSearchPage(pageUrl)
		}		
	}

	else if(mode === 'follow') {
		await yr.GetFollowing()
	}

	else if(mode === 'migrate') {
		const account = process.env.MIGRATE_ACCOUNT ||  'placeholder'
		const password = process.env.MIGRATE_PASSWORD || 'placeholder'		
		if(account === 'placeholder' || password === 'placeholder'){
			console.log('No Migrate Account/Password found in enviornment variables, Abort.')
			process.exit(0)
		}
		else{
			console.log(`Migrating ${account} to ${config.Account}`)
			await yr.CopyFollowing(account, password)
		}
	}

	process.exit(0)
}

if (require.main === module) {
	Run()
}
