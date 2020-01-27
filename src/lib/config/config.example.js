/**
 *
 * @type {IConfig}
 */
const exampleConfig = {
    logLevel: 'info',
    workDir: `${__dirname}/yandex`,
    mode: 'puppeteer',
    iterations: 70,
    workers: 1,
    pageTimeout: 90,
    puppeteerOptions: {
        headless: true,
        ignoreHTTPSErrors: false,
        warmIterations: 1,
        useWpr: true,
        recordWprCount: 50,
        selectWprCount: 10,
        selectWprMethod: 'closestByHtmlSize',
        cacheEnabled: false,
        cpuThrottling: {
            rate: 4,
        },
        networkThrottling: 'Regular2G',
        singleProcess: false,
        imagesEnabled: true,
        javascriptEnabled: true,
        cssFilesEnabled: true,
    },
    webdriverOptions: {
        host: 'localhost',
        port: 4444,
        user : '',
        key: '',
        desiredCapabilities: {
            'browserName': 'chrome',
            'version': '65.0',
        },
    },
    browserProfile: {
        mobile: false,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)' +
        ' Chrome/60.0.3112.113 Safari/537.36',
        height: 600,
        width: 800,
    },
    comparisons: [
        {
            name: 'main',
            sites: [
                {name: 'production', url: 'https://yandex.ru'},
                {name: 'prestable', url: 'https://yandex.ru'},
            ],
        },
        {
            name: 'company',
            sites: [
                {name: 'production', url: 'https://yandex.ru/company/'},
                {name: 'prestable', url: 'https://yandex.ru/company/'},
            ],
        },
    ],
    stages: {
        recordWpr: true,
        compareMetrics: true,
        compareLighthouse: true,
    },
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
    metricAggregations: [
        {name: 'count', includeMetrics: ['requestStart']}, // apply aggregation only for requestStart metric
        {name: 'q50'},
        {name: 'q80'},
        {name: 'q95'},
        {name: 'stdev', excludeMetrics: ['transferSize']},
    ],
    hooks: {
        async onVerifyWpr({logger, page, comparison, site}) {
            const hasJquery = await page.evaluate(() => !!window.jQuery);

            if (!hasJquery) {
                throw new Error('no jQuery on page, page incorrect');
            }
        },
        async onCollectMetrics({logger, page, comparison, site}) {
            const nodesCount = await page.evaluate(() => document.querySelectorAll('*').length);

            return {
                nodesCount,
            };
        },
    },
};

module.exports = exampleConfig;
