/**
 * 
 * @param {yrPixiv} yrPixivInstance 
 */
async function GetFollowingInfo(yrPixivInstance){    
	const userFollowingInfo = []    
	try {        
		let currentInfo = await yrPixivInstance.Pixiv.userFollowing(yrPixivInstance.selfId)        
		for (const userPreview of currentInfo.userPreviews) {
			const userId = userPreview.user.id
			const userName = userPreview.user.name
			userFollowingInfo.push({
				'id': userId,
				'name': userName
			})
		}        
        
		while (yrPixivInstance.Pixiv.hasNext()) {
			console.log(`Detect GetFollowingInfo has Next, Try: ${currentInfo.nextUrl}`)
			currentInfo = await yrPixivInstance.Pixiv.next()
			for (const userPreview of currentInfo.userPreviews) {
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