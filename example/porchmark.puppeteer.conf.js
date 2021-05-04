module.exports = {
    logLevel: 'debug',
    mode: 'puppeteer',
    iterations: 10,
    workers: 1,
    puppeteerOptions: {
        headless: true,
        useWpr: true,
        recordWprCount: 3,
        selectWprCount: 1,
        warmIterations: 2,
    },
    comparisons: [
        {
            name: 'main',
            sites: [
                {
                    name: 'first',
                    url: 'http://example.com/',
                },
                {
                    name: 'second',
                    url: 'http://example.com/',
                }
            ]
        }
    ]
};
