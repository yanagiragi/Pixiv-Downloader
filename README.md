# Pixiv-downloader
Pixiv Download Tool based on pixiv.js , public-Pixiv API and 難以名狀的抓圖器API V2

### Requirements 
> Node.js v6.2.2 (ECMAScript 6 supported)

### Require modules:
>1. pixiv.js
>2. pixiv-img
>3. request
>4. cheerio
>5. fs
>6. querystring
>7. babel-cli
>8. babel-preset-es2015
>9. dateformat
>10. readline

### How to Use
#####[Important] 
+ For those who download it without <code>node_module</code>, <br />
plz replace <code>node_module/pixiv.js/index.js</code> with <code>pixiv.js_replace/index.js</code>
+ Remember to modify src/data.js 

##### For Windows:
+ click *.bat
+ <code>1. One_Is_The_Loneliest_Number.bat </code> : download daily ranking
+ <code>2. Two_Tickets_To_Paradise.bat </code> : download page, e.g. http://www.pixiv.net/search.php?order=popular_d&word=name
+ <code>3. Three_Times_A_Lady.bat </code> : download user, e.g http://www.pixiv.net/member_illust.php?id=id

##### For Linux:
+ Open *.sh and replace it :
+ <code>%~dp0/node_modules/.bin/babel-node.cmd --harmony %~dp0/src/????.js</code> 
+ to
+ <code>node_modules/.bin/babel-node --harmony src/????.js</code>

##### P.S.
+ <code>page.js</code> & <code>user.js</code> supports <code>sys.argv[2]</code> for input

# LICENSE
WTFPL
