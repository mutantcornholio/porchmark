module.exports = {
    workDir: `${__dirname}/yandex`,
    mode: 'puppeteer',
    puppeteerOptions: {
        headless: true,
        warmIterations: 1,
        iterations: 70,
        useWpr: true,
        recordWprCount: 50,
        selectWprCount: 10,
        selectWprMethod: 'HtmlSizeCloser',
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
        host: 'your-grid-address.sh',
        port: 4444,
        user : 'selenium',
        key: 'selenium',
        desiredCapabilities: {
            'browserName': 'chrome',
            'version': '65.0',
        },
    },
    browserProfile: {
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
            ]
        },
        {
            name: 'company',
            sites: [
                {name: 'production', url: 'https://yandex.ru/company/'},
                {name: 'prestable', url: 'https://yandex.ru/company/'},
            ]
        }
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
        async onVerifyWpr(logger, page) {
            const hasJquery = await page.evaluate(() => !!window.jQuery);

            if (!hasJquery) {
                throw new Error('no jQuery on page, page incorrect');
            }
        },

        async onCollectMetrics(logger, page) {
            const nodesCount = await page.evaluate(() => document.querySelectorAll('*').length);

            return {
                nodesCount,
            };
        },
    },
};
