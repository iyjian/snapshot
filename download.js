const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const Util = require('./Util')
const fs = require('fs')
const path = require('path')
const moment = require('moment')

// const ENTRY_POINT = 'https://paimai.alltobid.com/login?type=individual'
// const ENTRY_POINT = 'https://paimai2.alltobid.com/login?type=individual'
// const ENTRY_POINT = 'https://trade.bidwin.top/login?type=individual&s=ooxx'
// const ENTRY_POINT = 'https://testh5.alltobid.com/login?type=individual'
// const ENTRY_POINT = 'http://localhost:8301/login?type=individual&s=ooxx'

const ENTRY_POINT = process.argv[2]

console.log(ENTRY_POINT)

const deleteFolderRecursive = (path) => {
  if( fs.existsSync(path) ) {
      fs.readdirSync(path).forEach(function(file) {
        var curPath = path + "/" + file;
          if(fs.lstatSync(curPath).isDirectory()) {
            deleteFolderRecursive(curPath);
          } else {
            fs.unlinkSync(curPath);
          }
      })
      fs.rmdirSync(path);
    }
}

const main = async () => {

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    devtools: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=zh'],
  })
  const page = (await browser.pages())[0]

  page.on('response' , async httpResponse => {
    try {
        /**********************************************************************************
         * 有网路请求的时候开始建目录
         **********************************************************************************/
        const downloadDir = path.join(__dirname, `./downloads/${moment().format('YYYY-MM-DD-HH-mm-ss')}`)
        const latestDownloadDir = path.join(__dirname, `./downloads/latest`)
        fs.mkdirSync(downloadDir, {recursive: true})
        deleteFolderRecursive(latestDownloadDir)
        fs.mkdirSync(latestDownloadDir, {recursive: true})
        /**********************************************************************************
         * 有网路请求的时候开始建目录
         **********************************************************************************/

        const request = httpResponse.request()
        const requestHeaders = request.headers()
        const requestMethod = request.method()
        const requestUrl = request.url()
        const requestResourceType = request.resourceType()
        const requestPostData = request.postData()

        const responseHeaders = httpResponse.headers()
        const responseBody = await httpResponse.buffer()
        const responseFromCache = httpResponse.fromCache()

        if (responseFromCache || /^blob:/.test(requestUrl)) {
          // Cache里有的以及本地创建的资源不下载保存
          return
        }
        console.log(requestUrl, requestResourceType, requestMethod)

        if (
          requestResourceType === 'document' || 
          requestResourceType === 'stylesheet' || 
          requestResourceType === 'script' || 
          requestResourceType === 'image'
        ) {
          const url = new URL(requestUrl)
          /**
           * 把 https://www.domain.com/ 保存为 index.html
           * 把 https://www.domain.com/login 保存为 login.html
          */
          const fullPathName = url.pathname === '/' ? '/index.html' : url.pathname.indexOf('.') === -1 ? `${url.pathname}.html` : url.pathname
          const dirName = path.dirname(fullPathName)

          fs.mkdirSync(path.join(downloadDir, dirName), {recursive: true})
          fs.writeFileSync(path.join(downloadDir, fullPathName), responseBody)

          fs.mkdirSync(path.join(latestDownloadDir, dirName), {recursive: true})
          fs.writeFileSync(path.join(latestDownloadDir, fullPathName), responseBody)
        }

        fs.appendFileSync(`${downloadDir}/full-log.md`, `

    ====================${requestMethod} ${requestUrl}===============================
    headers: ${JSON.stringify(requestHeaders, null, 2)}
    body:
    ${requestPostData ? requestPostData.toString('hex') : ''}


    response:
    headers: ${JSON.stringify(responseHeaders, null, 2)}
    body-text: ${responseBody ? responseBody.toString('hex') : ''}
    ================================================================================
    `)

    } catch (e) {
      console.log(`getResponse Error: ${e.message}`)
    }
  })

  await page.goto(ENTRY_POINT)

  setTimeout(async () => {
    await page.close()
    await browser.close()
  }, 10000)
}

main()

// cp -r /Users/wuchong/projects/study/download-paipai/downloads/latest/ /Users/wuchong/projects/study/autobid/newTradeServer/public/
