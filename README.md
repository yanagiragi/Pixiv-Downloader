# Pixiv-downloader

Pixiv Download Tool based on [akameco/pixiv-app-api](https://github.com/akameco/pixiv-app-api)

### Requirements 

* Node.js v11.0.0

* Enviornment : Ubuntu 16.04 LTS or Windows 10
    
### Run:

* Run with commands, Account & Password Saved in env (PIXIV_ACCOUNT & PIXIV_PASSWORD)

        node bin/cli.js -m $OPTIONS

* Daily Fetch Ranking: (remind that r-18 mode needs configure your pixiv account first )

        node bin/cli.js -m daily

* Get User's all illust

        node bin/cli.js -m user -i 3367474 -i 9794

* Get Single Search Page Result

        node bin/cli.js -m page -p "https://www.pixiv.net/search.php?word=FGO&order=date_d&p=4" -p "https://www.pixiv.net/search.php?word=FGO

* Get all following user illust

        node bin/ cli.js -m follow

* copy following (account & password Stored in enviroment variable "MIGRATE_ACCOUNT" and "MIGRATE_PASSWORD")
        
        node bin/cli.js -m migrate

### Note:

    * Currently Oauth Acccount are not allowed to login, check [here](https://github.com/upbit/pixivpy/issues/97)

