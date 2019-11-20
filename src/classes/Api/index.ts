import * as url from "url";
import * as path from "path";
import os from "os";

import {omit} from "lodash";
import jStat from 'jstat';
import joi = require('joi');
import cTable = require("console.table");

import {
    OriginalMetrics,
    watchingMetrics,
    watchingMetricsRealNames,
    IComparation,
    ICompareReleasesConfig,
    IRawCompareReleasesConfig,
    ISite,
    ISiteWithWprArchiveId,
} from "@/types";
import findFreePort from "@/modules/find-free-port";
import * as fs from "@/modules/fs";
import {IWprConfig, WprRecord, WprReplay} from "@/classes/Wpr";
import {BrowserApi, IBrowserLaunchOptions, IPageProfile, PuppeteerApi} from "@/classes/Puppeteer";
import * as view from '@/lib/view';
import {DataProcessor} from "@/lib/dataProcessor";
import {Logger} from "@/lib/logger";

import eventIterator from "./eventIterator";
import {
    ICompareEventIteratorOptions,
    ICompareMetricsOptions,
    IRecordWprConfig, IWprPair,
    IWprProcessOptions, IWprSize
} from "./types";

const FIND_PORT_BEGIN_PORT_DEFAULT = 10000;
const FIND_PORT_END_PORT_DEFAULT = 12000;
const FIND_PORT_STEP = 2;

const SLEEP_BEFORE_FIND_PORT = 100;
const SLEEP_BEFORE_NEXT_PAGE_OPEN = 100;
const RENDER_TABLE_INTERVAL = 200;

export class Api {
    protected _logger: Logger;
    protected _config = {
        findFreePort: {
            beginPort: FIND_PORT_BEGIN_PORT_DEFAULT,
            endPort: FIND_PORT_END_PORT_DEFAULT,
            host: "127.0.0.1",
            count: 2,
        }
    };
    protected _puppeteer: PuppeteerApi;

    constructor(logger: Logger) {
        this._logger = logger;
        this._puppeteer = new PuppeteerApi(this._logger);
    }

    public getBaseBrowserLaunchOptions(): IBrowserLaunchOptions {
        return {
            headless: true,
            ignoreHTTPSErrors: true,
            wpr: null,
        };
    }

    public getBasePageProfile(): IPageProfile {
        return {
            userAgent: null,
            height: null,
            width: null,
            networkThrottling: null,
            cpuThrottling: null,
            cacheEnabled: null,
            waitUntil: "networkidle0",
        };
    }

    public static async createWorkDir(logger: Logger, workDir: string): Promise<void> {
        const exists = await fs.exists(workDir);

        if (exists) {
            const stat = await fs.stat(workDir);

            if (!stat.isDirectory()) {
                throw new Error(`workDir is not directory: ${workDir}`);
            }

            logger.warn(`workDir already exists: ${workDir}`);
        } else {
            logger.info(`create workDir: ${workDir}`);
            await fs.mkdir(workDir);
        }
    }

    public createWorkDir(workDir: string): Promise<void> {
        return Api.createWorkDir(this._logger, workDir);
    }

    public saveConfig(workDir: string, name: string, config: any) {
        const configFilepath = this._getConfigFilepath(workDir, name);
        this._logger.debug(`save config: ${configFilepath}`);
        return fs.writeJson(configFilepath, config);
    }

    public async recordWpr(
        workDir: string,
        config: IRecordWprConfig,
    ) {
        const {id, site, browserLaunchOptions, pageProfile} = config;
        await this.saveConfig(workDir, `${site.name}-${id}.record-wpr`, config);

        const [httpPort, httpsPort] = await this._findTwoFreePorts();

        // start wpr record
        const wprRecordProcess = await this._createWprRecordProcess({
            httpPort,
            httpsPort,
            wprArchiveFilepath: this._getWprArchiveFilepath(workDir, site, id),
            stdoutFilepath: this._getWprRecordStdoutFilepath(workDir, site, id),
            stderrFilepath: this._getWprRecordStderrFilepath(workDir, site, id),
        });

        const browserLaunchWithWprProfile = {
            ...browserLaunchOptions,
            wpr: {
                httpPort,
                httpsPort,
            },
        };

        // start puppeteer
        const bro = await this._puppeteer.launch(browserLaunchWithWprProfile);

        try {
            await wprRecordProcess.start();

            const page = bro.createDesktopOrMobilePage(site.mobile, workDir, pageProfile, site);

            // load page
            await page.open();

            // reload
            // await page.reload();

            // save screenshot
            await page.screenshot(`-${id}`);
            // close page
            await page.close();

            this._logger.info("record wpr complete");
        } catch (e) {
            // TODO throw error
            this._logger.error("record wpr error", e);
        } finally {
            await bro.close();
            // stop wpr record
            await wprRecordProcess.stop();
            await wprRecordProcess.wait();
        }
    }

    public async recordOneWprsForManySites(
        workDir: string,
        options: {
            sites: ISite[];
            browserLaunchOptions: IBrowserLaunchOptions;
            pageProfile: IPageProfile;
        },
    ) {
        const {browserLaunchOptions, pageProfile} = options;

        const promises = [];

        for (let site of options.sites) {
            promises.push(this.recordWpr(workDir, {
                id: 0,
                site,
                browserLaunchOptions,
                pageProfile
            }));
        }

        await Promise.all(promises);
    }

    public async recordManyWprsForOneSite(
        workDir: string,
        options: {
            recordCount: number;
            site: ISite;
            browserLaunchOptions: IBrowserLaunchOptions;
            pageProfile: IPageProfile;
        }
    ) {
        const {recordCount, site, browserLaunchOptions, pageProfile} = options;

        for (let id=0; id < recordCount; id++) {
            await this.recordWpr(workDir, {
                id,
                site,
                browserLaunchOptions,
                pageProfile
            });
        }
    }

    public async recordManyWprsForManySites(
        workDir: string,
        options: {
            recordCount: number;
            sites: ISite[];
            browserLaunchOptions: IBrowserLaunchOptions;
            pageProfile: IPageProfile;
        }
    ) {
        const {recordCount, sites, browserLaunchOptions, pageProfile} = options;

        for (let id=0; id < recordCount; id++) {
            const promises = [];
            for (let site of sites) {
                promises.push(this.recordWpr(workDir, {
                    id,
                    site,
                    browserLaunchOptions,
                    pageProfile
                }));
            }

            await Promise.all(promises);
        }
    }

    public async compareMetrics(
        workDir: string,
        options: ICompareMetricsOptions,
    ) {
        const {
            id,
            sites,
            browserLaunchOptions,
            pageProfile,
            iterations,
            warmIterations,
            useWpr,
            silent
        } = options;

        await this.saveConfig(
            workDir,
            `compare-metrics-${id}-${sites.map(s => s.wprArchiveId).join("-")}`,
            omit(options, ["dataProcessor"])
        );
        const wprReplayProcesses: WprReplay[] = [];
        const browsers: BrowserApi[] = [];
        const eventIterators: Promise<unknown>[] = [];

        const dataProcessor = options.dataProcessor
            ? options.dataProcessor
            : this.createDataProcessor(options.sites);

        let viewInterval;

        for (let siteIndex in sites) {
            const site = sites[siteIndex];

            const browserLaunchProfile = {
                ...browserLaunchOptions,
            };

            const wprArchiveId = site.wprArchiveId;

            if (useWpr) {
                // start wpr record
                const [httpPort, httpsPort] = await this._findTwoFreePorts();
                const wprReplayProcess = await this._createWprReplayProcess({
                    httpPort,
                    httpsPort,
                    wprArchiveFilepath: this._getWprArchiveFilepath(workDir, site, wprArchiveId),
                    stdoutFilepath: this._getWprReplayStdoutFilepath(workDir, site, id, wprArchiveId),
                    stderrFilepath: this._getWprReplayStderrFilepath(workDir, site, id, wprArchiveId)
                });

                await wprReplayProcess.start();

                wprReplayProcesses.push(wprReplayProcess);

                browserLaunchProfile.wpr = {httpPort, httpsPort};
            }

            const browser = await this._puppeteer.launch(browserLaunchProfile);

            browsers.push(browser);

            const eventIterator = this._createCompareEventIterator(workDir, {
                id,
                dataProcessor,
                siteIndex: Number(siteIndex),
                site,
                browser,
                pageProfile,
                iterations,
                warmIterations,
            });

            // TODO move upper
            if (options.singleProcess && !silent && !viewInterval) {
                viewInterval = setInterval(() => {
                    view.renderTable(dataProcessor.calculateResults());
                }, RENDER_TABLE_INTERVAL);
            }

            if (options.singleProcess) {
                await eventIterator;
            }

            eventIterators.push(eventIterator);
        }

        if (!options.singleProcess && !silent && !viewInterval) {
            viewInterval = setInterval(() => {
                view.renderTable(dataProcessor.calculateResults());
            }, RENDER_TABLE_INTERVAL);
        }

        await Promise.all(eventIterators);
        await Promise.all(browsers.map(b => b.close()));
        await Promise.all(wprReplayProcesses.map(p => p.stop()));
        await Promise.all(wprReplayProcesses.map(p => p.wait()));

        if (viewInterval) {
            clearInterval(viewInterval);
        }

        view.softShutdown();

        await this._saveColorResultTable(workDir, view.getTableText(), id);

        this._logger.info("compare complete");
    }

    public async startBrowserWithWpr(
        workDir: string,
        wprArchiveFilepath: string
    ) {
        const platform = os.platform();

        if (platform !== "darwin") {
            throw new Error("only mac os support");
        }

        const [httpPort, httpsPort] = await this._findTwoFreePorts();

        const wprReplay = await this._createWprReplayProcess({
            httpPort,
            httpsPort,
            wprArchiveFilepath,
            stdoutFilepath: path.resolve(workDir, "browser_wpr_replay.stdout.log"),
            stderrFilepath: path.resolve(workDir, "browser_wpr_replay.stderr.log"),
        });

        await wprReplay.start();

        await this._puppeteer.launch({
            headless: false,
            ignoreHTTPSErrors: true,
            wpr: {
                httpPort,
                httpsPort,
            },
        });
    }

    public async compareLighthouse(
        workDir: string,
        options: {
            id: number;
            sites: ISiteWithWprArchiveId[];
            iterations: number;
            results? : any // TODO
        },
    ): Promise<{}> {
        const nodejsMajorVersion = Number(process.versions.node.split('.')[0]);

        this._logger.info(`node version=${nodejsMajorVersion}`);

        if (nodejsMajorVersion < 10) {
            throw new Error('lighthouse works only with nodejs > 10.13 (class URLShim extends URL error)');
        }

        // lighthouse works only with node > 10.13
        const lighthouse = require("lighthouse");

        const results: {
            [index: string]: { // site
                [index: string]: { // metric
                    metric: string;
                    score: number[];
                    numericValue: number[];
                }
            }
        } = options.results || {};

        const {id, sites} = options;

        for (const site of sites) {
            if (!results[site.name]) {
                results[site.name] = {};
            }

            const auditsStream = fs.createWriteStream(
                this._getLighthouseAuditsFilepath(workDir, site, id, site.wprArchiveId)
            );

            const [httpPort, httpsPort] = await this._findTwoFreePorts();

            const wprReplay = await this._createWprReplayProcess({
                httpPort,
                httpsPort,
                wprArchiveFilepath: this._getWprArchiveFilepath(workDir, site, id),
                stdoutFilepath: path.resolve(workDir, "browser_wpr_replay.stdout.log"),
                stderrFilepath: path.resolve(workDir, "browser_wpr_replay.stderr.log"),
            });

            await wprReplay.start();

            const browser = await this._puppeteer.launch({
                headless: true,
                ignoreHTTPSErrors: true,
                wpr: {
                    httpPort,
                    httpsPort,
                },
            });

            const {hostname, port} = url.parse(browser.browser.wsEndpoint());

            for (let i=0; i < options.iterations; i++) {
                const result = await lighthouse(site.url, {
                    hostname,
                    port,
                    onlyCategories: ['performance'],
                });

                const audits = result.lhr.audits;

                const json = JSON.stringify({
                    iteration: i,
                    ...audits,
                });
                auditsStream.write(`${json}\n`);

                Object.keys(audits).forEach(metric => {
                    if (!results[site.name][metric]) {
                        results[site.name][metric] = {
                            metric,
                            score: [],
                            numericValue: [],
                        };
                    }

                    results[site.name][metric].score.push(audits[metric].score);
                    results[site.name][metric].numericValue.push(audits[metric].numericValue);
                });

                this._logger.info(`${site.name} ${i}: TTI=${audits.interactive.displayValue}`);
            }

            await browser.close();
            await wprReplay.stop();
            await wprReplay.wait();
        }

        const metricsResults = await this.calcLighthouseMetrics(results);

        await fs.writeJson(this._getLighthouseResultFilepath(workDir, id), metricsResults);

        const {importantTable, allTable} = await this.calcLighthouseResultTable(metricsResults);

        await fs.writeFile(this._getLighthouseTableImportantFilepath(workDir, id), importantTable);

        this._logger.info(`\n\n${importantTable}\n\n`);

        await fs.writeFile(this._getLighthouseTableAllFilepath(workDir, id), allTable);

        return metricsResults;
    }

    public async calcLighthouseMetrics(
        siteResults: {
            [index: string]: { // site
                [index: string]: { // metric
                    metric: string;
                    score: number[];
                    numericValue: number[];
                }
            }
        }
    ) {
        const metricsResults: {
            [index: string]: {
                metric: string;
                score: number[][];
                numericValue: number[][];
            };
        } = {};

        Object.keys(siteResults).forEach((siteName) => {
            const metrics = siteResults[siteName];
            Object.entries(metrics).forEach(([name, metric]) => {
                if (!metricsResults[name]) {
                    metricsResults[name] = {
                        metric: name,
                        score: [],
                        numericValue: [],
                    };
                }

                metricsResults[name].score.push(metric.score);
                metricsResults[name].numericValue.push(metric.numericValue);
            });
        });
        return metricsResults;
    }

    // TODO refactor
    public async calcLighthouseResultTable(metricsResults: any) {
        const importantMetrics = [
            "first-contentful-paint",
            "first-meaningful-paint",
            "speed-index",
            "max-potential-fid",
            "total-blocking-time",
            "first-cpu-idle",
            "interactive",
            "total-byte-weight",
            "dom-size",
        ];

        const importantTable: any[] = [];
        const table: any[] = [];

        const toFixed = (o: any) => {
            const r: any = {};

            Object.keys(o).forEach(key => {
                if (typeof o[key] === 'number') {
                    r[key] = o[key].toFixed(3);
                } else {
                    r[key] = o[key];
                }
            });

            return r;
        };

        Object.keys(metricsResults).forEach(name => {
            const metric = metricsResults[name];

            const scoreA = metric.score[0];
            const scoreB = metric.score[1];

            const scoreMedianA = jStat.median(scoreA);
            const scoreMedianB = jStat.median(scoreB);

            const valueA = metric.numericValue[0];
            const valueB = metric.numericValue[1];

            const valueMedianA = jStat.median(valueA);
            const valueMedianB = jStat.median(valueB);

            const row = toFixed({
                metric: metric.metric,
                countA: scoreA.length,
                countB: scoreB.length,
                scoreMedianA,
                scoreMedianB,
                scoreMedianDiff: scoreMedianB - scoreMedianA,
                scorePValue: jStat.anovaftest(scoreA, scoreB),
                valueMedianA,
                valueMedianB,
                valueMedianDiff: valueMedianB - valueMedianA,
                valuePValue: jStat.anovaftest(valueA, valueB)
            });

            table.push(row);

            if (importantMetrics.includes(metric.metric)) {
                importantTable.push(row);
            }
        });

        const importantTableRendered = cTable.getTable(importantTable);
        const allTableRendered = cTable.getTable(table);

        return {
            importantTable: importantTableRendered,
            allTable: allTableRendered,
        };
    }

    public prepareCompareReleasesConfig(rawConfig: IRawCompareReleasesConfig): ICompareReleasesConfig {
        const config: ICompareReleasesConfig = {
            workDir: rawConfig.workDir,
            options: rawConfig.options,
            comparations: [],
        };

        for (const url of rawConfig.urls) {
            const comparation: IComparation = {
                name: url.name,
                config: {
                    workDir: path.resolve(config.workDir, url.name),
                    headless: config.options.headless,
                    sites: [],
                    useWpr: config.options.useWpr,
                    silent: config.options.silent,
                    iterations: config.options.iterations,
                    networkThrottling: config.options.networkThrottling,
                    cpuThrottling: config.options.cpuThrottling,
                    cacheEnabled: config.options.cacheEnabled,
                },
            };

            for (const host of rawConfig.hosts) {
                comparation.config.sites.push({
                    name: host.name,
                    url: `${host.host}${url.url}`,
                    mobile: config.options.mobile,
                });
            }

            config.comparations.push(comparation);
        }

        return config;
    }

    public createDataProcessor(sites: ISite[]) {
        // TODO make second argument options optional or refactor
        return new DataProcessor(sites.map(s => s.url), {} as any);
    }

    public async getWprSizes(workDir: string, sites: ISite[]) {
        const files = await fs.readdir(workDir);
        const wprFiles = files.filter((filename) => /.*\.wprgo$/.exec(filename));

        const parseFilenameRegex = /(.*)-(\d+)\.wprgo/;

        const wprs: IWprSize[] = wprFiles
            .map((filename: string) => {
                const match = parseFilenameRegex.exec(filename);

                if (!match) {
                    throw new Error(`cant parse wpr filename ${filename}`);
                }

                return {
                    filename,
                    siteName: match[1],
                    wprArchiveId: Number(match[2]),
                    size: -1, // TODO
                };
            });

        const sizes = await Promise.all(
            wprs.map(({filename}) => this._getFileSize(path.resolve(workDir, filename)))
        );

        const siteNames = sites.map(site => site.name);

        return wprs
            .map((w, i) => ({...w, size: sizes[i]}))
            // filter wprs for sites
            .filter((w) => siteNames.includes(w.siteName));
    }

    public getBestWprPairs(wprs: IWprSize[], sites: ISite[], count: number) {
        return this.getBestWprPairsMethodQuantiles(wprs, sites, count);
    }

    public validate<T>(data: any, schema: joi.Schema): Promise<T> {
        return new Promise((resolve, reject) => {
            const options: joi.ValidationOptions = {
                abortEarly: false,
                convert: true,
            };
            joi.validate<any, T>(data, schema, options, (err, valid) => {
                if (err) {
                    return reject(err);
                }

                resolve(valid);

                return valid;
            });
        });
    }

    /**
     * get wprs in quantiles by size
     */
    public getBestWprPairsMethodQuantiles(wprs: IWprSize[], sites: ISite[], count: number): IWprPair[] {
        if (sites.length > 2) {
            throw new Error("cant getBestWprPairs if sites.length > 2");
        }

        const a = wprs.filter(w => w.siteName === sites[0].name);
        const b = wprs.filter(w => w.siteName === sites[1].name);

        a.sort((x, y) => x.size - y.size);
        b.sort((x, y) => x.size - y.size);

        const aSizes = a.map(v => v.size);
        const bSizes = b.map(v => v.size);

        const quantiles = [0.35, 0.50, 0.65];

        this._logger.info(`getBestWprPairsMethodQuantiles: quantiles=${quantiles}`);

        const [minA, medianA, maxA] = jStat.quantiles(aSizes, quantiles);
        const [minB, medianB, maxB] = jStat.quantiles(bSizes, quantiles);

        this._logger.info("aQuantiles", [minA, medianA, maxA]);
        this._logger.info("bQuantiles", [minB, medianB, maxB]);

        const aFiltered = a.filter(v => v.size >= minA && v.size <= maxA);
        const bFiltered = b.filter(v => v.size >= minB && v.size <= maxB);

        this._logger.info("aFiltered.length", aFiltered.length);
        this._logger.info("bFiltered.length", bFiltered.length);

        const iterator = aFiltered.length <= bFiltered.length ? aFiltered : bFiltered;

        const iteratorCount = count > iterator.length ? iterator.length : count;

        const result: IWprPair[] = [];

        this._logger.info(`getBestWprPairsMethodQuantiles: count of wpr pairs=${iteratorCount}`);

        for (let i=0; i < iteratorCount; i++) {
            result.push({
                aWprArchiveId: aFiltered[i].wprArchiveId,
                aWprArchiveSize:  aFiltered[i].size,
                bWprArchiveId: bFiltered[i].wprArchiveId,
                bWprArchiveSize: bFiltered[i].size,
                diff: bFiltered[i].size - aFiltered[i].size,
            });
        }

        return result;
    }

    /**
     * get wprs with minimal difference by size
     */
    public getBestWprPairsMethodCloser(wprs: IWprSize[], sites: ISite[], count: number): IWprPair[] {
        if (sites.length > 2) {
            throw new Error("cant getBestWprPairs if sites.length > 2");
        }

        const a = wprs.filter(w => w.siteName === sites[0].name);
        const b = wprs.filter(w => w.siteName === sites[1].name);

        let diff: IWprPair[] = [];
        const aSelected: number[] = [];
        const bSelected: number[] = [];

        a.forEach((_, i) => {
            b.forEach((_, j) => {
                diff.push({
                    aWprArchiveId: a[i].wprArchiveId,
                    aWprArchiveSize: a[i].size,
                    bWprArchiveId: b[j].wprArchiveId,
                    bWprArchiveSize: b[j].size,
                    diff: b[j].size - a[i].size
                });
            });
        });

        diff.sort((a, b) => {
            return Math.abs(a.diff) - Math.abs(b.diff);
        });

        const result = [];

        for (let i = 0; i < count; i++) {
            const selected = diff.shift();

            if (!selected) {
                // TODO fail if no data
                continue;
            }

            result.push(selected);

            aSelected.push(selected.aWprArchiveId);
            bSelected.push(selected.bWprArchiveId);

            diff = diff.filter(v => {
                return !aSelected.includes(v.aWprArchiveId) && !bSelected.includes(v.bWprArchiveId);
            });
        }

        return result;
    }

    public prepareSitesWithWprArchiveId(sites: ISite[], pairs: IWprPair[]): ISiteWithWprArchiveId[][] {
        if (sites.length > 2) {
            throw new Error("cant prepareSitesWithWprArchiveId if sites.length > 2");
        }

        const sitesWithWprArchiveId: ISiteWithWprArchiveId[][] = [];

        for (const pair of pairs) {
            sitesWithWprArchiveId.push(
                [
                    {
                        ...sites[0],
                        wprArchiveId: pair.aWprArchiveId,
                    },
                    {
                        ...sites[1],
                        wprArchiveId: pair.bWprArchiveId,
                    }
                ]
            );
        }

        return sitesWithWprArchiveId;
    }

    protected async _createCompareEventIterator(
        workDir: string,
        options: ICompareEventIteratorOptions,
    ) {
        const {id, dataProcessor, siteIndex, site, browser, pageProfile, iterations} = options;

        const metricNames = [
            "fetchStart",
            "domainLookupStart",
            "domainLookupEnd",
            "connectStart",
            "connectEnd",
            "requestStart",
            "responseEnd",
            "responseStart",
            "domInteractive",
            "domContentLoadedEventStart",
            "domContentLoadedEventEnd",
            "loadEventStart",
            "loadEventEnd",
            "domComplete",

            'first-paint',
            'first-contentful-paint',

            "transferSize",
            "encodedBodySize",
            "decodedBodySize",
        ];

        function filterMetrics(metrics: OriginalMetrics) {
            const filteredMetrics: any = {};

            for (let name of metricNames) {
                // for (let name of Object.keys(WatchingMetricsRealNames)) {
                // @ts-ignore TODO fix types
                filteredMetrics[name] = metrics[name];
            }

            return filteredMetrics;
        }

        function registerMetrics([originalMetrics, siteIndex]: [OriginalMetrics, number]): void {
            const transformedMetrics: number[] = [];

            for (let metricIndex = 0; metricIndex < watchingMetrics.length; metricIndex++) {
                const metricName = watchingMetricsRealNames[metricIndex];
                transformedMetrics[metricIndex] = originalMetrics[metricName];
            }

            dataProcessor.registerMetrics(siteIndex, transformedMetrics);
        }

        const wprArchiveId = site.wprArchiveId;

        const metricsStream = fs.createWriteStream(this._getMetricsFilepath(workDir, site, id ,wprArchiveId));
        const entriesStream = fs.createWriteStream(this._getPerformanceEntriesFilepath(workDir, site, id, wprArchiveId));

        const writeMetrics = (iteration: number, metrics: OriginalMetrics) => {
            const json = JSON.stringify({
                iteration,
                name: site.name,
                ...filterMetrics(metrics),
            });
            metricsStream.write(`${json}\n`);
        };

        const writePerfomanceEntries = (iteration: number, entries: any) => {
            const json = JSON.stringify({
                iteration,
                ...entries
            });
            entriesStream.write(`${json}\n`);
        };

        const createPage = () => {
            return browser.createDesktopOrMobilePage(
                site.mobile,
                workDir,
                pageProfile,
                site
            );
        };

        // warmIterations
        if (options.warmIterations) {
            this._logger.debug(`warm page before compare: iterations=${options.warmIterations}`);
            for (let i=0; i < options.warmIterations; i++) {
                const page = createPage();
                await page.open();
                // await page.reload();
                await page.screenshot(`-warm-${id}-${i}`);
                await page.close();
            }
        }

        await eventIterator(iterations, async (i: number) => {
            const page = createPage();
            await page.open();
            const metrics = await page.getMetrics();
            writeMetrics(i, metrics);
            registerMetrics([metrics, siteIndex]);
            const entries = await page.getPerformanceEntries();
            writePerfomanceEntries(i, entries);
            await page.close();
            await this._sleep(SLEEP_BEFORE_NEXT_PAGE_OPEN);
        });

        metricsStream.close();
        entriesStream.close();
    }

    protected async _createWprRecordProcess(options: IWprProcessOptions) {
        return this._createWprProcess("record", options) as Promise<WprRecord>;
    }

    protected async _createWprReplayProcess(options: IWprProcessOptions) {
        return this._createWprProcess("replay", options) as Promise<WprReplay>;
    }

    protected async _createWprProcess(mode: "record" | "replay", options: IWprProcessOptions) {
        const platform = os.platform();

        if (['darwin', 'linux'].includes(platform) === false) {
            throw new Error("only mac and linux platforms supported for wpr tests");
        }

        const wprToolDir = path.resolve(__dirname, '..', '..', '..', 'wpr');

        const config: IWprConfig = {
            ...options,
            bin: path.resolve(wprToolDir, `wpr_${platform}`),
            certFile: path.resolve(wprToolDir, 'wpr_cert.pem'),
            keyFile: path.resolve(wprToolDir, 'wpr_key.pem'),
            injectScripts: path.resolve(wprToolDir, 'deterministic.js'),
        };

        return mode === 'record'
            ? new WprRecord(this._logger, config)
            : new WprReplay(this._logger, config);
    }

    protected async _findTwoFreePorts(): Promise<number[]> {
        const config = this._config.findFreePort;
        this._logger.debug(`search free ports`, config);

        this._config.findFreePort.beginPort += FIND_PORT_STEP;

        this._logger.debug(
            `moving config.findFreePort.beginPort + ${FIND_PORT_STEP}`,
            this._config.findFreePort.beginPort
        );

        if (this._config.findFreePort.beginPort > this._config.findFreePort.endPort) {
            this._logger.debug("reset config.findFreePort.beginPort to default", FIND_PORT_BEGIN_PORT_DEFAULT);
            this._config.findFreePort.beginPort = FIND_PORT_BEGIN_PORT_DEFAULT;
        }

        const beginPort = config.beginPort;
        const endPort = config.endPort;

        await this._sleep(SLEEP_BEFORE_FIND_PORT);

        const ports = await findFreePort(
            beginPort,
            endPort,
            config.host,
            config.count
        );
        this._logger.debug(`found free ports: ${ports}`);

        return ports;
    }

    protected async _saveColorResultTable(workDir: string, resultTable: string, id: number) {
        const resultTableFilepath = this._getColorResultTableFilepath(workDir, id);
        this._logger.debug(`save color result table: ${resultTableFilepath}`);
        await fs.writeFile(resultTableFilepath, resultTable + "\n");
    }

    protected async _getFileSize(filepath: string): Promise<number> {
        const stat = await fs.stat(filepath);
        return stat.size;
    }

    protected _getWprRecordStdoutFilepath(workDir: string, site: ISite, id: number) {
        return path.resolve(workDir, `${site.name}-${id}.wpr_record.stdout.log`);
    }

    protected _getWprRecordStderrFilepath(workDir: string, site: ISite, id: number) {
        return path.resolve(workDir, `${site.name}-${id}.wpr_record.stderr.log`);
    }

    protected _getWprReplayStdoutFilepath(workDir: string, site: ISite, id: number, wprArchiveId: number) {
        return path.resolve(workDir, `${site.name}-${id}-${wprArchiveId}.wpr_replay.stdout.log`);
    }

    protected _getWprReplayStderrFilepath(workDir: string, site: ISite, id: number, wprArchiveId: number) {
        return path.resolve(workDir, `${site.name}-${id}-${wprArchiveId}.wpr_replay.stderr.log`);
    }

    protected _getWprArchiveFilepath(workDir: string, site: ISite, id: number) {
        return path.resolve(workDir, `${site.name}-${id}.wprgo`);
    }

    protected _getMetricsFilepath(workDir: string, site: ISite, id: number, wprArchiveId: number) {
        return path.resolve(workDir, `${site.name}-${id}-${wprArchiveId}.metrics.jsonl`);
    }

    protected _getPerformanceEntriesFilepath(workDir: string, site: ISite, id: number, wprArchiveId: number) {
        return path.resolve(workDir, `${site.name}-${id}-${wprArchiveId}.preformance-entries.jsonl`);
    }

    protected _getLighthouseAuditsFilepath(workDir: string, site: ISite, id: number, wprArchiveId: number) {
        return path.resolve(workDir, `${site.name}-${id}-${wprArchiveId}.lighthouse-audits.jsonl`);
    }

    protected _getConfigFilepath(workDir: string, name: string) {
        return path.resolve(workDir, `${name}.config.json`);
    }

    protected _getColorResultTableFilepath(workDir: string, id: number) {
        return path.resolve(workDir, `color-result-table-${id}.txt`);
    }

    protected _getLighthouseResultFilepath(workDir: string, id: number) {
        return path.resolve(workDir, `lighthouse-result-${id}.json`);
    }

    protected _getLighthouseTableImportantFilepath(workDir: string, id: number) {
        return path.resolve(workDir, `lighthouse-table-important-${id}.txt`);
    }

    protected _getLighthouseTableAllFilepath(workDir: string, id: number) {
        return path.resolve(workDir, `lighthouse-table-all-${id}.txt`);
    }

    protected _sleep(ms: number) {
        return new Promise((resolve) => {
            setTimeout(() => {resolve()}, ms);
        });
    }
}
