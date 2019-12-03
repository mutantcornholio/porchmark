import {NetworkProfiles} from '@/lib/config/types';

export interface IBrowserLaunchOptions {
    headless: boolean;
    ignoreHTTPSErrors: boolean;
    wpr: null | {
        httpPort: number;
        httpsPort: number;
    };
    imagesEnabled: boolean;
}

export interface IPageProfile {
    userAgent: string | null;
    width: number;
    height: number;

    cacheEnabled: boolean;
    javascriptEnabled: boolean;
    cssFilesEnabled: boolean;

    cpuThrottling: null | {
        rate: number;
    };
    networkThrottling: null | NetworkProfiles;
    pageNavigationTimeout: number;
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
