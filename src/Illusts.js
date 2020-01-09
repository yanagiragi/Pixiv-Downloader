const path = require('path')
const sanitize = require('sanitize-filename')

/**
 * Return lists of object formatted in {url, savePath, filename} for download
 * Note this does not create folder, folder should create outside
 * @return {Array} illusts
 * @param {yrPixiv} yrPixivInstance 
 * @param {Object} illustInfo 
 */
function GetIllustsDownloadInfo(yrPixivInstance, illustInfo) {
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

    while (yrPixivInstance.Pixiv.hasNext()) {
        currentInfo = await yrPixivInstance.Pixiv.next()    
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

    while (yrPixivInstance.Pixiv.hasNext()) {
        currentInfo = await yrPixivInstance.Pixiv.next()
        for( const info of currentInfo.illusts) {
            rankingInfo.illusts.push(info)
        }           
    }

    return rankingInfo
}

module.exports = {
    GetUserIllustsInfo,
    GetIllustsDownloadInfo,
    GetDailyIllustsInfo
}