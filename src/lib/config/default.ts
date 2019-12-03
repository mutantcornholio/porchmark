import {IConfig, SelectWprMethods} from '@/lib/config/types';

export const DEFAULT_VIEWPORT_WIDTH = 1366;
export const DEFAULT_VIEWPORT_HEIGHT = 768;

export default {
  workDir: '',
  mode: 'puppeteer',
  iterations: 70,
  puppeteerOptions: {
    headless: true,
    warmIterations: 1,
    useWpr: true,
    recordWprCount: 50,
    selectWprCount: 10,
    selectWprMethod: SelectWprMethods.HtmlSizeCloser,
    cacheEnabled: true,
    imagesEnabled: true,
    javascriptEnabled: true,
    cssFilesEnabled: true,
  },
  browserProfile: {
    mobile: false,
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
} as IConfig;
