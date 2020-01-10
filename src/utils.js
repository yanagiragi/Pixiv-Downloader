const fs = require('fs-extra')
const path = require('path')
const sanitize = require('sanitize-filename')
const fetch = require('node-fetch')

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
 * Return Promise when pixiv image download completes
 * @return {string} output - saved path of the image
 * @param {string} url 
 * @param {string} filename 
 */
async function GetPixivImage (url, filename) {
    console.assert(!fs.existsSync(filename))
    const response = await fetch(url, { encoding : 'binary', headers: { 'Referer': 'http://www.pixiv.net/'}, timeout: 1000 * 5 })
	const body = await response.text()
	fs.writeFileSync(filename, body, 'binary')
    console.log(`Stored: ${filename}`)
    return filename
}

async function GetUserIllustName(yrPixivInstance, userid) {
    const currentInfo = await yrPixivInstance.Pixiv.userDetail(userid)
    return currentInfo.user.name
}

/**
 * Return lists of object formatted in {url, savePath, filename} for download
 * Note this does not create folder, folder should create outside
 * @return {Array} illusts
 * @param {Object} illustInfo 
 */
function ParseIllustsInfoToDownloadInfo(illustInfo) {
    const illusts = []
    illustInfo.illusts.map(ele => {
        if (ele.metaPages.length === 0) { // single pic in single illust
            const url = ele.metaSinglePage.originalImageUrl
            const mime = url.substring(url.length - 4)
            const filename = `${ele.id}-${sanitize(ele.title)}${mime}`
            const savePath = illustInfo.storePath
            illusts.push({url, savePath, filename})
        } 
        else { // multiple pictures in single illust        
            const savePath = path.join(illustInfo.storePath, `${ele.id}-${ele.title}`)
            ele.metaPages.map((ele2, index) => {
                const url = ele2.imageUrls.original
                const mime = url.substring(url.length - 4)
                const filename = `${ele.id}-${sanitize(ele.title)}_p${index}${mime}`
                illusts.push({url, savePath, filename})
            })            
        }
    })
    return illusts
}

function DateFormat(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

module.exports = {
    GetPixivImage,
    GetUserStoragePath,
    GetUserIllustName,
    ParseIllustsInfoToDownloadInfo,
    DateFormat
}
