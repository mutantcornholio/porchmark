module.exports = {
    workDir: `${__dirname}/yandex`,
    options: {
        headless: true,
        warmIterations: 1,
        iterations: 70,
        mobile: true,
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
