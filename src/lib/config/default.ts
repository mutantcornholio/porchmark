import {IConfig, SelectWprMethods} from '@/lib/config/types';

export default (): IConfig => ({
    logLevel: 'info',
    workDir: '',
    mode: 'puppeteer',
    iterations: 70,
    workers: 1,
    pageTimeout: 20, // in seconds
    puppeteerOptions: {
        headless: true,
        ignoreHTTPSErrors: false,
        warmIterations: 1,
        useWpr: true,
        recordWprCount: 50,
        selectWprCount: 10,
        selectWprMethod: SelectWprMethods.closestByHtmlSize,
        cacheEnabled: true,
        imagesEnabled: true,
        javascriptEnabled: true,
        cssFilesEnabled: true,
        cpuThrottling: null,
        networkThrottling: null,
        pageNavigationTimeout: 60000,
    },
    webdriverOptions: {
        host: 'localhost',
        port: 4444,
        user : '',
        key: '',
        desiredCapabilities: {
            browserName: 'chrome',
            version: '65.0',
        },
    },
    browserProfile: {
        mobile: false,
        userAgent: null,
        height: 0,
        width: 0,
    },
    comparisons: [],
    stages: {
        recordWpr: true,
        compareMetrics: true,
        compareLighthouse: false,
    },
    metrics: [
        {name: 'requestStart'},
        {name: 'responseStart', title: 'TTFB'},
        {name: 'responseEnd', title: 'TTLB'},
        {name: 'first-contentful-paint', title: 'FCP'},
        {name: 'domContentLoadedEventEnd', title: 'DCL'},
        {name: 'loadEventEnd', title: 'loaded'},
    ],
    metricAggregations: [
        {name: 'count', includeMetrics: ['requestStart']},
        {name: 'q50'},
        {name: 'q80'},
        {name: 'q95'},
    ],
    hooks: {},
});
