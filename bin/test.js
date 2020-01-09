const yrPixiv_New = require('../src/yrPixiv_new')
const fs = require('fs')

if (require.main === module) {
    const configPath = '../../yrPixiv.config.json'
    const config = JSON.parse(fs.readFileSync(configPath))    
    const yrPixivInstance = new yrPixiv_New(config)
    // yrPixivInstance.GetFollowing()
    yrPixivInstance.GetDaily().then(() => {
        console.log('exit')
        process.exit(0)
    })
}