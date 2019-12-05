import {IConfig, SelectWprMethods} from '@/lib/config/types';

export const DEFAULT_MOBILE_USER_AGENT = 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/76.0.3809.100 Mobile Safari/537.36';

export const DEFAULT_VIEWPORT_WIDTH = 1366;
export const DEFAULT_VIEWPORT_HEIGHT = 768;

export const DEFAULT_MOBILE_VIEWPORT_WIDTH = 667;
export const DEFAULT_MOBILE_VIEWPORT_HEIGHT = 375;

export default (): IConfig => ({
    workDir: '',
    mode: 'puppeteer',
    iterations: 70,
    workers: 1,
    timeout: 90, // in minutes
    puppeteerOptions: {
        headless: true,
        ignoreHTTPSErrors: false,
        warmIterations: 1,
        useWpr: true,
        recordWprCount: 50,
        selectWprCount: 10,
        selectWprMethod: SelectWprMethods.HtmlSizeCloser,
        cacheEnabled: true,
        imagesEnabled: true,
        javascriptEnabled: true,
        cssFilesEnabled: true,
        cpuThrottling: null,
        networkThrottling: null,
        pageNavigationTimeout: 60000,
    },
    browserProfile: {
        mobile: false,
        userAgent: null,
        height: DEFAULT_VIEWPORT_HEIGHT,
        width: DEFAULT_VIEWPORT_WIDTH,
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
        {name: 'count', includeMetrics: ['requestStart']},
        {name: 'q50'},
        {name: 'q80'},
        {name: 'q95'},
    ],
    hooks: {},
});
