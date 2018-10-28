export enum WatchingMetrics {
    requestStart = 'requestStart',
    TTFB = 'TTFB',
    TTLB = 'TTLB',
    FCP = 'FCP',
    DCL = 'DCL',
    loaded = 'loaded',
}

export const watchingMetrics: WatchingMetrics[] = [
    WatchingMetrics.requestStart,
    WatchingMetrics.TTFB,
    WatchingMetrics.TTLB,
    WatchingMetrics.FCP,
    WatchingMetrics.DCL,
    WatchingMetrics.loaded,
];

export enum WatchingMetricsRealNames {
    requestStart = 'requestStart',
    responseStart = 'responseStart',
    responseEnd = 'responseEnd',
    'first-contentful-paint' = 'first-contentful-paint',
    domContentLoadedEventEnd = 'domContentLoadedEventEnd',
    loadEventEnd = 'loadEventEnd',
}

export const watchingMetricsRealNames: WatchingMetricsRealNames[] = [
    WatchingMetricsRealNames.requestStart,
    WatchingMetricsRealNames.responseStart,
    WatchingMetricsRealNames.responseEnd,
    WatchingMetricsRealNames['first-contentful-paint'],
    WatchingMetricsRealNames.domContentLoadedEventEnd,
    WatchingMetricsRealNames.loadEventEnd,
];

export type OriginalMetrics = {[K in WatchingMetricsRealNames]: number};
