const fs = require('fs')
const defaultConfigPath = 'yrPixiv-default.config.json'

class Config
{
    constructor({ ConfigPath=defaultConfigPath } = {}) {
        this.ConfigPath = ConfigPath
        let config = JSON.parse(fs.readFileSync(this.ConfigPath))
        let { Account, Password, WorkingDirectory, Filter, StoragePath, GetUserPath, GetPagePath, FollowPath, DailyPath, DailyAmount, TOKEN_DIR, TOKEN_PATH, PARENT_FOLDERS_ID, CILENTSECRET_PATH } = config
        this.Account = Account
        this.Password = Password        
        this.WorkingDirectory = WorkingDirectory
        this.Filter = Filter
        this.StoragePath = StoragePath
		this.GetUserPath = GetUserPath
		this.GetPagePath = GetPagePath
        this.FollowPath = FollowPath
        this.DailyPath = DailyPath
        this.DailyAmount = DailyAmount
        this.TOKEN_DIR = TOKEN_DIR
		this.TOKEN_PATH = TOKEN_PATH
		this.PARENT_FOLDERS_ID = PARENT_FOLDERS_ID
        this.CILENTSECRET_PATH = CILENTSECRET_PATH
    }
}

function DateFormat(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

module.exports.Config = Config
module.exports.DateFormat = DateFormat