const fs = require('fs-extra')
const path = require('path')
const sanitize = require('sanitize-filename')
const PixivImg = require('pixiv-img')

/**
 * Return current userStoragePath based on userInfo and update PixivIDCache if needed.
 * @param {*} yrPixivInstance 
 * @param {*} userInfo 
 * @param {string} [overrideStoragePath] - optional string to override pathPrefix. used in GetFollowing
 */
function GetUserStoragePath(yrPixivInstance, userInfo, overrideStoragePath='') {    
    
    let pathPrefix = path.join(yrPixivInstance.StoragePath, yrPixivInstance.GetUserPath)

    if (overrideStoragePath != '') {
        pathPrefix = overrideStoragePath
    }
    
    const userId = userInfo.id
    let username = sanitize(userInfo.name)
    
    let matched = yrPixivInstance.PixivIDCache.find(x => x.id == userId)
    if (matched){
        const matchedName = sanitize(matched.name)        
        if (username !== matchedName) { // username has changed            
            matched.name = username
            console.log(`Detect new username ${username} for ${matchedName}, rename directory.`)                                    
            
            const originalPath = path.join(pathPrefix ,`${userId}-${matchedName}/`)
            const newPath = path.join(pathPrefix, `${userId}-${username}/`)

            if(fs.existsSync(originalPath))
                fs.moveSync(originalPath, newPath, {overwrite: true})
            else
                console.log(`${originalPath} does not exists, create ${newPath} instead.`)
        }
    }
    else {
        console.log(`Add ${userId}-${username} to PixivIDCache`)
        this.PixivIDCache.push({'id': userId, 'name': username})
    }

    return path.join(pathPrefix, `${userId}-${username}/`)
}	

/**
 * Save PixivIDCache in yrPixivInstance
 * @param {yrPixiv} yrPixivInstance 
 */
function SavePixivCache(yrPixivInstance) {
    console.log(`Save ${yrPixivInstance.PixivIDCachePath}.`)
    fs.writeJsonSync(yrPixivInstance.PixivIDCachePath, yrPixivInstance.PixivIDCache, {spaces: '\t'})
}

/**
 * Return Promise when pixiv image download completes
 * @return {string} output - saved path of the image
 * @param {string} url 
 * @param {string} filename 
 */
async function GetPixivImage (url, filename) {
    console.assert(!fs.existsSync(filename))
    const output = await PixivImg(url, filename)
    console.log(`Stored: ${output}`)
    return output    
}

async function GetUserIllustName(yrPixivInstance, userid) {
    const currentInfo = await yrPixivInstance.Pixiv.userDetail(userid)
    return currentInfo.user.name
}

module.exports = {
    SavePixivCache,
    GetPixivImage,
    GetUserStoragePath,
    GetUserIllustName
}