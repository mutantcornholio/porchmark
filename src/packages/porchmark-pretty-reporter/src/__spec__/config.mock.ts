import { IConfig } from '../types/porchmark';

export default <IConfig>({
    mode: 'puppeteer',
    iterations: 70,
    workers: 1,
    browserProfile: {
        mobile: false,
        userAgent: null,
        height: 0,
        width: 0,
    },
    comparisons: [],
    metrics: [
        {name: 'requestStart', showInTable: true},
        {name: 'responseStart', title: 'TTFB', showInTable: true},
        {name: 'responseEnd', title: 'TTLB', showInTable: true},
        {name: 'first-paint', showInTable: false},
        {name: 'first-contentful-paint', title: 'FCP', showInTable: true},
        {name: 'domContentLoadedEventEnd', title: 'DCL', showInTable: true},
        {name: 'loadEventEnd', title: 'loaded', showInTable: true},
        {name: 'domInteractive', showInTable: false},
        {name: 'domComplete', showInTable: false},
        {name: 'transferSize', showInTable: false},
        {name: 'encodedBodySize', showInTable: false},
        {name: 'decodedBodySize', showInTable: false},
    ],
    metricAggregations: [
        {name: 'count', includeMetrics: ['requestStart']},
        {name: 'q50'},
        {name: 'q80'},
        {name: 'q95'},
    ],
});