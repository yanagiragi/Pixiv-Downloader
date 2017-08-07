# Pixiv-downloader

Pixiv Download Tool based on <a href="https://github.com/akameco/pixiv">pixiv.js</a> , <a href="https://github.com/akameco/pixiv-img">pixiv-img</a>

### Requirements 
+ Node.js v6.2.2 (ECMAScript 6 supported)
+ Test Enviornment : Linux

### Before start
##### [Important] 
+ plz replace <code>node_module/pixiv.js/index.js</code> with <code>pixiv.js_replace/index.js</code>
+ Remember to modify src/data.js 

### How to Use

> Fetch Rankings: <code>node date.pixiv.js [mode] [date(format: yyyy-mm-dd)]</code>

    remind that r-18 mode needs configure your pixiv account first 

> Fetching Users : <code>node user.js [user_homepage_url]</code>

> Fetching Single Page: <code>node page.js [page_url]</code>

> Fetching All Follow's Picture: <code>node follow.js</code>

> (Self-Use) Fetching daily and store it to google drive or remote storage: <code>node pipeline.js[date(format: yyyy-mm-dd)]</code>

### Others

> Register page based on laravel5 (www/pixiv-register)
