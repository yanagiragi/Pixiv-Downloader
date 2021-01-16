/**
 * 
 * @param {*} yrPixivInstance 
 * @param {*} userInfo 
 */
async function GetUserIllustsInfo(yrPixivInstance, userInfo) {
    
	const userIllustsInfo = { 'illusts': [], 'storePath': '' }

	let currentInfo = await yrPixivInstance.Pixiv.userIllusts(userInfo.id)
	for (const info of currentInfo.illusts) {
		userIllustsInfo.illusts.push(info)
	}

	if (yrPixivInstance.verbose){
		console.log(JSON.stringify(currentInfo))
	}

	while (currentInfo.next_url != null) {
		currentInfo = await yrPixivInstance.Pixiv.requestUrl(currentInfo.next_url)
		for (const info of currentInfo.illusts) {
			userIllustsInfo.illusts.push(info)
		}
	}

	return userIllustsInfo
}

async function GetDailyIllustsInfo(yrPixivInstance) {

	const rankingInfo = { 'illusts': [], 'storePath': '' }

	let currentInfo = await yrPixivInstance.Pixiv.illustRanking()
	for( const info of currentInfo.illusts) {
		rankingInfo.illusts.push(info)
	}

	while (currentInfo.next_url != null) {
		currentInfo = await yrPixivInstance.Pixiv.requestUrl(currentInfo.next_url)
		for( const info of currentInfo.illusts) {
			rankingInfo.illusts.push(info)
		}           
	}

	return rankingInfo
}

async function GetSearchIllustsInfo(yrPixivInstance, query, pageIndex) {
    
	// pixiv show 40 search results per page
	const searchResultPerPage = 60
	const searchInfo = { 'illusts': [], 'storePath': '' }

	let currentInfo = await yrPixivInstance.Pixiv.searchIllust(query)
	for( const info of currentInfo.illusts) {
		searchInfo.illusts.push(info)
	}
    
	while (currentInfo.next_url != null && searchInfo.illusts.length < searchResultPerPage * pageIndex) {
		currentInfo = await yrPixivInstance.Pixiv.requestUrl(currentInfo.next_url)
		for( const info of currentInfo.illusts) {
			searchInfo.illusts.push(info)
		}           
	}

	// splice the result to exactly the amount we need
	searchInfo.illusts = searchInfo.illusts.splice(searchResultPerPage * (pageIndex - 1), searchResultPerPage)

	return searchInfo
}

module.exports = {
	GetUserIllustsInfo,
	GetDailyIllustsInfo,
	GetSearchIllustsInfo
}