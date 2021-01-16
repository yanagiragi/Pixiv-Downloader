/**
 * 
 * @param {yrPixiv} yrPixivInstance 
 */
async function GetFollowingInfo(yrPixivInstance){    
	const userFollowingInfo = []    
	try {        
		let currentInfo = await yrPixivInstance.Pixiv.userFollowing(yrPixivInstance.selfId)  
		if (yrPixivInstance.verbose){
			console.log(JSON.stringify(currentInfo, null, 4))
		}
		for (const userPreview of currentInfo.user_previews) {
			const userId = userPreview.user.id
			const userName = userPreview.user.name
			userFollowingInfo.push({
				'id': userId,
				'name': userName
			})
		}        
        
		while (currentInfo.next_url != null) {
			console.log(`Detect GetFollowingInfo has Next, Try: ${currentInfo.next_url}`)
			currentInfo = await yrPixivInstance.Pixiv.requestUrl(currentInfo.next_url)
			for (const userPreview of currentInfo.user_previews) {
				const userId = userPreview.user.id
				const userName = userPreview.user.name
				userFollowingInfo.push({
					'id': userId,
					'name': userName
				})
			}
		}

		return userFollowingInfo
	}
	catch (err) {
		throw err
	}    
}

module.exports = { GetFollowingInfo }