# porchmark
Simple tool to compare browser performance of several pages.  
It opens given pages at the same time, and capture browser performance metrics. A lot of times.  
Main purpose is to help testing hypotheses about frontend performance in development environment.  

![screencast.gif](http://mcornholio-s3.s3.amazonaws.com/porchmark-screencast-3.gif)  

### Installation:
What do you think?  
```
npm install -g porchmark
```

### Example:

```
npm i
cd example
node ../dist/bin/porchmark.js compare -c ./porchmark.puppeteer.conf.js
```

### Usage:
#### Puppeteer mode
porchmark launches several headless chromium browsers on your desktop. Easy start, but there's never enough CPU to get that data fast. It's possible to run porchmark in puppeteer mode on server, but that'll require X.  

#### Webdriver mode
Pretty much the same, but does the work on remote webdriver browsers. If you have a large Selenium Grid, you'll be able to get that data in no time.  
To run porchmark in webdriver mode You'll have to make a config file (just copy that one ↓).

CLI args:
```
    Usage: porchmark compare <site 1> <site 2> ...

    Options:
      -V, --version                 output the version number
      -i, --iterations <n>          stop after n iterations; defaults to 300
      -P, --parallel <n>            run checks in n workers; defaults to 1
      -m, --mobile                  chrome mobile UA, iphone 6-like screen, touch events, etc.
      -k, --insecure                ignore HTTPS errors
      -t, --timeout <n>             timeout in seconds for each check; defaults to 20s
      -c  --config [configfile.js]  path to config; default is `porchmark.conf.js` in current dir
      -v, --verbose                 verbose logging, -v (debug), -vv (trace)
      -h, --help                    output usage information
```

Config file:
```js
module.exports = {
    // log level - 'trace', 'debug', 'info', 'warn', 'error', 'fatal'
    logLevel: 'info',
    // workdir for comparison files (screenshots, WPR-archives, etc)
    // by default is current work dir (cwd)
    workDir: `${__dirname}/some-workdir`,
    // mode - 'puppeteer' or 'webdriver'
    mode: 'puppeteer',
    // how many iterations run for every comparison (and every WPR for puppeteer mode)
    iterations: 70,
    // how many parallel workers
    workers: 1,
    // page open timeout
    pageTimeout: 90,
    // disable terminal table UI
    withoutUi: false,

    // options for puppeteer mode
    puppeteerOptions: {
        // run browser headless or not
        headless: true,

        // ignore https errors - useful for custom ssl certificates
        ignoreHTTPSErrors: false,

        // use Web Page Replay (WPR) archives - https://bit.ly/2JgTUbt
        useWpr: true,

        // how many WPR archives record
        recordWprCount: 50,

        // how many WPR archive pairs select for every comparison
        selectWprCount: 10,

        // method for WPR archive selection
        // - simple - select WPRs in recorded order
        // - closestByWprSize - select WPR pairs by WPR archive size, with minimal diff by size
        // - closestByHtmlSize - select WPRs by html size from server, this is default
        // - closestByScriptSize - select WPRs by script size from server
        selectWprMethod: 'closestByHtmlSize',

        // enable/disable browser cache on page open
        cacheEnabled: false,

        // cpu throttling
        cpuThrottling: {
            rate: 4,
        },

        // network throttling
        // 'GPRS', 'Regular2G', 'Good2G', 'Regular3G', 'Good3G', 'Regular4G', 'DSL', 'WiFi'
        networkThrottling: 'Regular2G',

        // enable/disable load images
        imagesEnabled: true,

        // enable/disable javascript on page
        javascriptEnabled: true,

        // enable/disable css files
        // this work with puppeteer request interceptions and may slow down comparison
        cssFilesEnabled: true,
        
        // puppeteer page navigation timeout
        pageNavigationTimeout: 60000,
           
        // puppeteer waitUntil page open 
        // 'load', 'domcontentloaded', 'networkidle0', 'networkidle2'
        waitUntil:  'load',

        // retry count if WPR record fails
        retryCount: 10,
    },

    // webdriver options
    webdriverOptions: {
        host: 'your-grid-address.sh',
        port: 4444,
        user : '',
        key: '',
        desiredCapabilities: {
            'browserName': 'chrome',
            'version': '65.0',
        },
    },

    // browser profile
    browserProfile: {
        // emulate mobile useragent and viewport
        mobile: false,

        // set useragent
        userAgent: 'your-user-agent',

        // viewport height
        height: 600,

        // viewport width
        width: 800,
    },

    // setup comparisons with array
    comparisons: [
        {
            // uniq comparison name
            name: 'main',

            sites: [
                {
                    // uniq site name
                    name: 'production',
                    // url
                    url: 'https://host1.ru'
                },
                {
                    name: 'prestable',
                    url: 'https://host2.ru'
                },
            ],
        },
        // ...
    ],
    stages: {
        // run record WPR stage
        recordWpr: true,

        // run comparison metrics
        compareMetrics: true,
    },

    // metrics for collect
    metrics: [
        {name: 'requestStart'},
        {name: 'responseStart', title: 'TTFB'},
        {name: 'responseEnd', title: 'TTLB'},
        {name: 'first-paint'},
        {name: 'first-contentful-paint', title: 'FCP'},
        {name: 'domContentLoadedEventEnd', title: 'DCL'},
        {name: 'loadEventEnd', title: 'loaded'},
        {name: 'domInteractive'},
        {name: 'domComplete'},
        {name: 'transferSize'},
        {name: 'encodedBodySize'},
        {name: 'decodedBodySize'},
    ],

    // metric aggregations
    metricAggregations: [
        {
            name: 'count',
            includeMetrics: ['requestStart']
        }, // apply aggregation only for requestStart metric
        {name: 'q50'},
        {name: 'q80'},
        {name: 'q95'},
        {
            name: 'stdev',
            excludeMetrics: ['transferSize']
        },
    ],

    //
    hooks: {

        // verify page on WPR record - throw error if not valid
        async onVerifyWpr({logger, page, comparison, site}) {
            const hasJquery = await page.evaluate(
                () => !!window.jQuery
            );

            if (!hasJquery) {
                throw new Error(
                    'no jQuery on page, page incorrect'
                );
            }
        },

        // collect and return custom metrics from page
        async onCollectMetrics({logger, page, comparison, site}) {
            const nodesCount = await page.evaluate(
                () => document.querySelectorAll('*').length
            );

            return {
                nodesCount,
            };
        },
    },
};

```
