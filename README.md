# Pixiv-downloader

Pixiv Download Tool based on [akameco/pixiv-app-api](https://github.com/akameco/pixiv-app-api) , [akameco/pixiv-img](https://github.com/akameco/pixiv-img)

### Requirements 

* Node.js v11.0.0

* Enviornment : Ubuntu 16.04 LTS or Windows 10

### For First Time:

* modified bin/config_template/yrPixiv-default.config.json, make sure it is same with [setuped path](https://github.com/yanagiragi/Pixiv-Downloader/blob/master/bin/cli.js#L7)
    
* P.S. You may need to setup credentials in CILENTSECRET_PATH if you want to use upload features
    
### Run:

*  globally install yrPixiv

    `npm install -g .`    

*  or just install prerequisite

    `npm install .`

* Run with commands

    `yrPixiv -m $OPTIONS` or `node cli.js -m $OPTIONS``

* Daily Fetch Ranking: (remind that r-18 mode needs configure your pixiv account first )

    `yrPixiv -m daily` or `node cli.js -m daily``
    
* Other mode

    * Get User's all illust

            `yrPixiv -m user -i 3367474 -i 9794` or `node cli.js -m user -i 3367474 -i 9794`
    
    * Get Single Search Page Result
    
            `yrPixiv -m page -p "https://www.pixiv.net/search.php?word=FGO&order=date_d&p=4" -p "https://www.pixiv.net/search.php?word=FGO"` 
            
            or
            
            `node cli.js -m page -p "https://www.pixiv.net/search.php?word=FGO&order=date_d&p=4" -p "https://www.pixiv.net/search.php?word=FGO"`
    
    * Get all following user illust
    
            `yrPixiv -m follow` or `node cli.js -m follow`
    
    * copy following (account & password Stored in enviroment variable "PIXIV_ACCOUNT" and "PIXIV_PASSWORD")
    
            `yrPixiv -m migrate` or `node cli.js -m migrate`

### Note:

    * Currently Oauth Acccount are not allowed to login, check [here](https://github.com/upbit/pixivpy/issues/97)

### Others

* [**Deprecated**] Register page based on laravel5 (www/pixiv-register)

