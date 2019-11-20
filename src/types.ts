import {NETWORK_PRESET_TYPES} from "@/classes/Puppeteer";

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

export interface ISite {
    name: string;
    url: string;
    mobile?: boolean;
}

export interface ISiteWithWprArchiveId extends ISite{
    wprArchiveId: number;
}

export interface ICompareConfig {
    headless: boolean;
    workDir: string;
    sites: ISite[];
    useWpr: boolean;
    silent: boolean;
    iterations: number;
    networkThrottling: null | NETWORK_PRESET_TYPES,
    cpuThrottling: null | {
        rate: number;
    };
    cacheEnabled: null | boolean;
    // waitUntil: LoadEvent;
}

export interface IRawCompareReleasesConfig {
    workDir: string;
    options: {
        headless: boolean;
        iterations: number;
        warmIterations: number;
        recordCount: number;
        cycleCount: number;
        mobile: boolean;
        useWpr: boolean;
        silent: boolean;
        networkThrottling: null | NETWORK_PRESET_TYPES,
        cpuThrottling: null | {
            rate: number;
        };
        cacheEnabled: null | boolean;
        selectWprMethod: string;
        singleProcess: boolean;
    };
    hosts: Array<{name: string; host: string;}>;
    urls: Array<{name: string; url: string;}>;
    stages: {
        recordWpr: boolean;
        compareMetrics: boolean;
    };
}

export interface IComparation {
    name: string,
    config: ICompareConfig;
}

export interface ICompareReleasesConfig {
    workDir: string;
    options: {
        headless: boolean;
        iterations: number;
        mobile: boolean;
        useWpr: boolean;
        silent: boolean;
        networkThrottling: null | NETWORK_PRESET_TYPES,
        cpuThrottling: null | {
            rate: number;
        };
        cacheEnabled: null | boolean;

    };
    comparations: Array<IComparation>;
}
