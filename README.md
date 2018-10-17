# Pixiv-downloader

Pixiv Download Tool based on [akameco/pixiv-app-api](https://github.com/akameco/pixiv-app-api) , [akameco/pixiv-img](https://github.com/akameco/pixiv-img)

### Requirements 

* Node.js v8.2.0

* Enviornment : Ubuntu 16.04 LTS

### For First Time:

    cp src/data_template.js src/data.js
    
    setup account/password setting in src/data.js
    
    cp src/uploadGoogle_template.js src/uploadGoogle.js
    
    setup folder setting in src/uploadGoogle.js & setup credentials
    
### Run:

* Daily Fetch Ranking:

        cd src; node pipeline.js
    
* Other mode

    * Get User's all illust

            node main.js -m user -i 3367474 -i 9794
    
    * Get User's Daily Ranking (remind that r-18 mode needs configure your pixiv account first )
        
            node main.js -m daily
    
    * Get Single Search Page Result
    
            node main.js -m page -p "https://www.pixiv.net/search.php?word=FGO&order=date_d&p=4" -p "https://www.pixiv.net/search.php?word=FGO"
    
    * Get all following user illust
    
            node main.js -m follow
    
    * copy following (manual required)
    
            node main.js -m migrate

### Others

* [**Deprecated**]Register page based on laravel5 (www/pixiv-register)
