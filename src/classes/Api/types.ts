import {ISite, ISiteWithWprArchiveId} from "@/types";
import {BrowserApi, IBrowserLaunchOptions, IPageProfile} from "@/classes/Puppeteer";
import {DataProcessor} from "@/lib/dataProcessor";

export interface IRecordWprConfig {
    id: number;
    site: ISite,
    browserLaunchOptions: IBrowserLaunchOptions,
    pageProfile: IPageProfile,
}

export interface IWprProcessOptions {
    wprArchiveFilepath: string,
    httpPort: number,
    httpsPort: number,
    stdoutFilepath: string,
    stderrFilepath: string,
}

export interface ICompareEventIteratorOptions {
    id: number;
    dataProcessor: DataProcessor,
    siteIndex: number,
    site: ISiteWithWprArchiveId,
    browser: BrowserApi,
    pageProfile: IPageProfile,
    iterations: number;
    warmIterations: number;
}

export interface ICompareMetricsOptions {
    id: number;
    dataProcessor?: DataProcessor;
    sites: ISiteWithWprArchiveId[];
    browserLaunchOptions: IBrowserLaunchOptions;
    pageProfile: IPageProfile;
    iterations: number;
    warmIterations: number;
    useWpr: boolean;
    silent: boolean;
    // TODO multi workers
    singleProcess: boolean;
}

export interface IWprSize {
    filename: string;
    siteName: string;
    wprArchiveId: number;
    size: number;
}

export interface IWprPair {
    aWprArchiveId: number;
    aWprArchiveSize: number;
    bWprArchiveId: number;
    bWprArchiveSize: number;
    diff: number;
}
