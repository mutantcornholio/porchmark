# porchmark
Simple tool to compare browser performance of several pages.  
It opens given pages at the same time, and capture browser performance metrics. A lot of times.  
Main purpose is to help testing hypotheses about frontend performance in development environment.  

![screencast.gif](http://mcornholio-s3.s3.amazonaws.com/porchmark-screencast-3.gif)  

## Installation:
What do you think?  
```
npm install -g porchmark
```

## Usage:

## `porchmark compare-realtime <site1> <site2> ...`

#### Puppeteer mode
porchmark launches several headless chromium browsers on your desktop. Easy start, but there's never enough CPU to get that data fast. It's possible to run porchmark in puppeteer mode on server, but that'll require X.  

#### Webdriver mode
Pretty much the same, but does the work on remote webdriver browsers. If you have a large Selenium Grid, you'll be able to get that data in no time.  
To run porchmark in webdriver mode You'll have to make a config file (just copy that one ↓).

CLI args:
```
    Usage: porchmark <site 1> <site 2> ...

    Options:
      -V, --version                 output the version number
      -i, --iterations <n>          stop after n iterations; defaults to 300
      -P, --parallel <n>            run checks in n workers; defaults to 1
      -m, --mobile                  chrome mobile UA, iphone 6-like screen, touch events, etc.
      -k, --insecure                ignore HTTPS errors
      -t, --timeout <n>             timeout in seconds for each check; defaults to 20s
      -c  --config [configfile.js]  path to config; default is `porchmark.conf.js` in current dir
      -h, --help                    output usage information
```

Config file:
```js
module.exports = {
  maxIterations: 500,
  workers: 50,
  mobile: false,
  insecure: false,
  mode: 'webdriver', // other one is 'puppeteer'
  webdriverOptions: { // your selenium grid address and credentials.
    host: 'your-grid-address.sh',
    port: 4444,
    user : 'selenium',
    key: 'selenium',
    desiredCapabilities: {
      'browserName': 'chrome',
      'version': '65.0',
    },
  },
  browserProfile: { // on top of built-in 'desktop' and 'mobile' profiles, you can overwrite User-Agent
                    // or viewport size; this poor list will be updated soon
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)' +
        ' Chrome/60.0.3112.113 Safari/537.36',
    height: 1920,
    width: 1080,
  },
};

```

## `porchmark compare-releases --config <filepath>`

compare sites using Web Page Replay

Config file: 

```js
module.exports = {
  "workDir": "./test-compare", // --------------  workDir
  "options": {  // ----------------------------- options:
    "headless": true, // ----------------------- headless chrome or not, default=true
    "iterations": 11, // ----------------------- iteration count for every WPR archive, default=11
    "mobile": true, // ------------------------- desktop or mobile (user-agent and viewport changed), default=false
    "useWpr": true, // ------------------------- use WPR record/replay or not, default=true
    "cpuThrottling": { // ---------------------- cpu throttling options, default=null
         "rate": 8 // -------------------------- cpu throttling rate (2, 4, 6 ...)
    },
    "networkThrottling": "Regular3G", // ------ network throttling (GPRS, Regular2G, Good2G, Regular3G, Good3G, Regular4G, DSL, WiFi), default=null
    "cacheEnabled": true, // ------------------ open page with cache or not, default=true
    "silent": false, // ----------------------- write log to stderr or not, default=false
    "recordCount": 10, // --------------------- how many WPR archive record for every site url, default=10
    "cycleCount": 3, // ----------------------- how many WPR archives select from recorded WPR archives, default=1
    "selectWprMethod": "bestPairsQuantiles", // select wpr methods (bestPairsCloser, bestPairsQuantiles), default=bestPairsQuantiles
    "warmIterations": 1, // ------------------- how many times open page before compare, default=1
    "singleProcess": false, // ---------------- run single browser or parallel, default=false
  },
  "hosts": [ // ------------------------------- hosts for comparision: only 2 hosts
    {
        "name": "craigslist", // -------------- uniq host name
        "host": "https://craigslist.org" // --- protocol + host
    },
    {
        "name": "wikipedia",
        "host": "https://wikipedia.org"
    }
  ],
  "urls": [ // ------------------------------- urls for compare
    {
      "name": "main", // --------------------- uniq url name
      "url": "/" // -------------------------- url without hostname
    }
  ],
  "stages": { // ----------------------------- stages (recordWpr and compareMetrics)
    "recordWpr": true, // -------------------- record wpr before compare, default=true
    "compareMetrics": true // ---------------- compare metrics, default=true
  }
}
```
