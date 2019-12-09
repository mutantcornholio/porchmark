import fs from 'fs-extra';
import path from 'path';

import {IComparison, IConfig} from '@/lib/config';
import {findTwoFreePorts} from '@/lib/findFreePorts';
import {
    getComparisonDir,
    getWprArchiveFilepath,
    getWprRecordStderrFilepath,
    getWprRecordStdoutFilepath,
} from '@/lib/fs';
import {getLogger} from '@/lib/logger';
import {createPage, launchBrowser, prepareBrowserLaunchOptions, preparePageProfile} from '@/lib/puppeteer';
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
        const launchBrowserPromises = [];

        for (const site of comparison.sites) {
            const [httpPort, httpsPort] = await findTwoFreePorts();

            const wprRecordProcess = createWprRecordProcess({
                httpPort,
                httpsPort,
                stdoutFilepath: getWprRecordStdoutFilepath(comparisonDir, site, id),
                stderrFilepath: getWprRecordStderrFilepath(comparisonDir, site, id),
                wprArchiveFilepath: getWprArchiveFilepath(comparisonDir, site, id),
            });
            wprRecordProcesses.push(wprRecordProcess);

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
        const pageOpens = [];

        for (const siteIndex of comparison.sites.keys()) {
            const site = sites[siteIndex];
            const browser = browsers[siteIndex];

            const pageProfile = preparePageProfile(config);

            pageProfile.cacheEnabled = false;
            pageProfile.cpuThrottling = null;
            pageProfile.networkThrottling = null;

            const page = await createPage(browser, pageProfile);

            pageOpens.push(page.goto(site.url, {waitUntil: 'networkidle0'}));
        }

        await Promise.all(pageOpens);

        // close wpr processes and browsers
        await Promise.all(
            [
                ...browsers.map((bro) => bro.close()),
                ...wprRecordProcesses.map((p) => p.stop()),
            ],
        );
    }

    logger.info(`[recordWprArchives] complete: record wpr archives for comparison: ${comparison.name}`);
};
