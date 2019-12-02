import puppeteer from 'puppeteer';

export interface IBrowserLaunchOptions {
    headless: boolean;
    ignoreHTTPSErrors: boolean;
    wpr: null | {
        httpPort: number;
        httpsPort: number;
    };
    imagesEnabled: boolean;
}

export type NETWORK_PRESET_TYPES =
    'GPRS' | 'Regular2G' | 'Good2G' |
    'Regular3G' | 'Good3G' | 'Regular4G' |
    'DSL' | 'WiFi';

export interface IPageProfile {
    userAgent: string | null;
    height: number | null;
    width: number | null;
    networkThrottling: null | NETWORK_PRESET_TYPES;
    cpuThrottling: null | {
        rate: number;
    };
    cacheEnabled: null | boolean;
    waitUntil: puppeteer.LoadEvent;
    javascriptEnabled: boolean;
    cssFilesEnabled: boolean;
}

export interface IPageStructureSizes {
    root: number;
    script: number;
    style: number;
    scripts: {
        [index: string]: number;
    };
}

export interface IPageStructureSizesHooks {
    onPageStructureSizesNode?: (sizes: IPageStructureSizes, node: any) => void;
    onPageStructureSizesComplete?: (
        sizes: IPageStructureSizes,
        html: string,
        getSizeInBytes: (html: string, start: number, end: number) => number,
    ) => void;
}
