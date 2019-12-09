import fs from 'fs-extra';
import path from 'path';
import puppeteer from 'puppeteer';

import {IComparison, IConfig} from '@/lib/config';
import {findTwoFreePorts} from '@/lib/findFreePorts';
import {
    getComparisonDir,
    getPageStructureSizesAfterLoadedFilepath, getPageStructureSizesFilepath,
    getWprArchiveFilepath,
    getWprRecordStderrFilepath,
    getWprRecordStdoutFilepath, getWprReplayStderrFilepath, getWprReplayStdoutFilepath,
} from '@/lib/fs';
import {sleep} from '@/lib/helpers';
import {getLogger} from '@/lib/logger';
import {
    createPage,
    IPageProfile,
    launchBrowser,
    prepareBrowserLaunchOptions,
    preparePageProfile,
} from '@/lib/puppeteer';
import {getPageStructureSizes} from '@/lib/puppeteer/pageStructureSizes';
import {ISite} from '@/types';
import {IBaseWprConfig, IWprConfig, IWprProcessOptions} from './types';
import WprRecord from './WprRecord';
import WprReplay from './WprReplay';

const logger = getLogger();

const rootDir = path.resolve(__dirname, '../../..');
const wprToolDir = path.resolve(`${rootDir}/wpr`);

const baseConfig: IBaseWprConfig = {
    bin: path.resolve(wprToolDir, `wpr`),
    certFile: path.resolve(wprToolDir, 'wpr_cert.pem'),
    keyFile: path.resolve(wprToolDir, 'wpr_key.pem'),
    injectScripts: path.resolve(wprToolDir, 'deterministic.js'),
};

export const createWprRecordProcess = (options: IWprProcessOptions) => {
    const config: IWprConfig = {
        ...baseConfig,
        ...options,
    };

    return new WprRecord(config);
};

export const createWprReplayProcess = (options: IWprProcessOptions) => {
    const config: IWprConfig = {
        ...baseConfig,
        ...options,
    };

    return new WprReplay(config);
};

const openPageWithRetries = async (page: puppeteer.Page, site: ISite, retryCount = 3): Promise<puppeteer.Page> =>  {
    let retry = 0;

    while (retry < retryCount) {
        try {
            await page.goto(site.url, {waitUntil: 'networkidle0'});
            return page;
        } catch (error) {
            retry++;

            if (retry > retryCount) {
                throw error;
            } else {
                logger.error(error);
                logger.warn(`retry page open: ${site.url}`);
            }
        }
    }

    return page;
};

export const recordWprArchives = async (comparison: IComparison, config: IConfig): Promise<void> => {
    logger.info(`[recordWprArchives] start: record wpr archives for comparison: ${comparison.name}`);

    const sites = comparison.sites;

    // check workDir
    const comparisonDir = getComparisonDir(config.workDir, comparison);

    if (!fs.existsSync(comparisonDir)) {
        await fs.mkdir(comparisonDir);
    }

    const {recordWprCount} = config.puppeteerOptions;

    for (let id = 0; id < recordWprCount; id++) {
        logger.info(
            `[recordWprArchives] record wpr archives: ${id + 1} of ${recordWprCount}`,
        );
        const wprRecordProcesses = [];
        const wprReplayProcesses = [];
        const launchBrowserPromises = [];

        for (const site of comparison.sites) {
            const [httpPort, httpsPort] = await findTwoFreePorts();

            const wprArchiveFilepath = getWprArchiveFilepath(comparisonDir, site, id);

            const wprRecordProcess = createWprRecordProcess({
                httpPort,
                httpsPort,
                stdoutFilepath: getWprRecordStdoutFilepath(comparisonDir, site, id),
                stderrFilepath: getWprRecordStderrFilepath(comparisonDir, site, id),
                wprArchiveFilepath,
            });
            wprRecordProcesses.push(wprRecordProcess);

            const wprReplayProcess = createWprReplayProcess({
                httpPort,
                httpsPort,
                stdoutFilepath: getWprReplayStdoutFilepath(comparisonDir, site, 0, id),
                stderrFilepath: getWprReplayStderrFilepath(comparisonDir, site, 0, id),
                wprArchiveFilepath,
            });
            wprReplayProcesses.push(wprReplayProcess);

            const launchOptions = {
                ...prepareBrowserLaunchOptions(config),
                wpr: {httpPort, httpsPort},
            };

            const browser = launchBrowser(launchOptions);
            launchBrowserPromises.push(browser);
        }

        // start and wait wpr record processes and browsers
        await Promise.all([
            Promise.all(wprRecordProcesses.map((p) => p.start())),
            Promise.all(launchBrowserPromises),
        ]);

        // get launched browsers
        const browsers = await Promise.all(launchBrowserPromises);

        // ready
        const recordPageWprPromises = [];

        for (const siteIndex of comparison.sites.keys()) {
            const site = sites[siteIndex];
            const browser = browsers[siteIndex];

            logger.info(`[recordWprArchives] record wpr archive for ${site.name}`);

            const pageProfile = preparePageProfile(config);

            pageProfile.cacheEnabled = false;
            pageProfile.cpuThrottling = null;
            pageProfile.networkThrottling = null;

            const page = await createPage(browser, pageProfile);

            const pageStructureSizesPromise = openPageWithRetries(page, site)
                .then(() => getPageStructureSizes(page))
                .then(
                    (sizes) => fs.writeJson(getPageStructureSizesAfterLoadedFilepath(comparisonDir, site, id), sizes),
                )
                .then(() => page.close());

            recordPageWprPromises.push(pageStructureSizesPromise);
        }

        await Promise.all(recordPageWprPromises);

        // close wpr record processes
        await Promise.all(wprRecordProcesses.map((p) => p.stop()));

        // start wpr replay process on same ports
        await Promise.all(wprReplayProcesses.map(
            (p) => p.start().then(() => sleep(100)),
        ));

        const pageStructureSizesPromises = [];

        // get page structure sizes without javascript
        for (const siteIndex of comparison.sites.keys()) {
            const site = sites[siteIndex];
            const browser = browsers[siteIndex];

            logger.info(`[recordWprArchives] get page structure sizes for ${site.name}`);

            const pageProfile: IPageProfile = {
                ...preparePageProfile(config),
                cpuThrottling: null,
                networkThrottling: null,
                javascriptEnabled: false,
            };
            const page = await createPage(browser, pageProfile);

            const pageStructureSizesPromise = openPageWithRetries(page, site)
                .then(() => getPageStructureSizes(page))
                .then(
                    (sizes) => fs.writeJson(getPageStructureSizesFilepath(comparisonDir, site, id), sizes),
                )
                .then(() => page.close());

            pageStructureSizesPromises.push(pageStructureSizesPromise);
        }

        await Promise.all(pageStructureSizesPromises);

        // close wpr processes and browsers
        await Promise.all(
            [
                ...browsers.map((bro) => bro.close()),
                ...wprReplayProcesses.map((p) => p.stop()),
            ],
        );
    }

    logger.info(`[recordWprArchives] complete: record wpr archives for comparison: ${comparison.name}`);
};
