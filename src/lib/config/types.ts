import puppeteer from 'puppeteer';

import {Logger} from '@/lib/logger';
import {IPageStructureSizes} from '@/lib/puppeteer/types';
import {IWprArchive} from '@/lib/wpr/types';
import {ISite, RecursivePartial} from '@/types';

export enum SelectWprMethods {
  simple = 'simple',
  closestByWprSize = 'closestByWprSize',
  // medianByWprSize = 'medianByWprSize',
  closestByHtmlSize = 'closestByHtmlSize',
  closestByScriptSize = 'closestByScriptSize',
}

export type NetworkProfiles = 'GPRS' | 'Regular2G' | 'Good2G' | 'Regular3G' | 'Good3G' | 'Regular4G' | 'DSL' | 'WiFi';

export interface IPuppeteerOptions {
  headless: boolean;
  ignoreHTTPSErrors: boolean;
  useWpr: boolean;
  recordWprCount: number;
  selectWprCount: number;
  selectWprMethod: SelectWprMethods;
  cacheEnabled: boolean;
  cpuThrottling: null | {
    rate: number;
  };
  networkThrottling: NetworkProfiles | null;
  imagesEnabled: boolean;
  javascriptEnabled: boolean;
  cssFilesEnabled: boolean;
  pageNavigationTimeout: number;
  waitUntil: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  retryCount: number;
  warmIterations: number;
}

export interface IWebdriverOptions {
  host: string;
  port: number;
  user: string;
  key: string;
  desiredCapabilities: {
    browserName: string;
    version: string;
  };
}

export interface IBrowserProfile {
  mobile: boolean;
  userAgent: string | null;
  width: number;
  height: number;
}

export interface IComparison {
  name: string;
  sites: ISite[];
  wprArchives?: IWprArchive[];
}

export interface IConfigMetric {
  name: string;
  title?: string;
  showInTable?: boolean;
}

export interface IConfigMetricsAggregation {
  name: 'q50' | 'q80' | 'q95' | 'stdev' | 'count';
  includeMetrics?: string[];
  excludeMetrics?: string[];
}

export interface IHookObject {
  logger: Logger;
  page: puppeteer.Page;
  comparison: IComparison;
  site: ISite;
}

export type VerifyWprHook = (hook: IHookObject) => Promise<void>;
export type CollectMetricsHook = (hook: IHookObject) => Promise<{[index: string]: number}>;

// TODO node type
export type PageStructureSizesNodeHook = (sizes: IPageStructureSizes, node: any) => void;

export type PageStructureSizesCompleteHook = (
  sizes: IPageStructureSizes,
  html: string,
  getSizeInBytes: (html: string, start: number, end: number) => number,
) => void;

export interface IConfigHooks {
  onVerifyWpr?: VerifyWprHook;
  onCollectMetrics?: CollectMetricsHook;
  onPageStructureSizesNode?: PageStructureSizesNodeHook;
  onPageStructureSizesComplete?: PageStructureSizesCompleteHook;
}

export interface IConfig {
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  workDir: string;
  mode: 'puppeteer' | 'webdriver';
  iterations: number;
  workers: number;
  pageTimeout: number;
  withoutUi: boolean;
  puppeteerOptions: IPuppeteerOptions;
  webdriverOptions: IWebdriverOptions;
  browserProfile: IBrowserProfile;
  comparisons: IComparison[];
  stages: {
    recordWpr: boolean;
    compareMetrics: boolean;
    compareLighthouse: boolean;
  };
  metrics: IConfigMetric[];
  metricAggregations: IConfigMetricsAggregation[];
  hooks: IConfigHooks;
}

export type IPartialConfig = RecursivePartial<IConfig>;

export interface IPuppeteerConfig extends IConfig {
  puppeteerOptions: IPuppeteerOptions;
}
