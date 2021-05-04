import puppeteer from 'puppeteer';

import {getLogger} from '@/lib/logger';
import {ICheckOptions, IOriginalMetrics, ISite} from '@/types';

const logger = getLogger();

import {findTwoFreePorts} from '@/lib/findFreePorts';
import {
    getComparisonDir,
    getWprArchiveFilepath,
    getWprReplayStderrFilepath,
    getWprReplayStdoutFilepath,
} from '@/lib/fs';
import {createWprReplayProcess} from '@/lib/wpr';
import WprReplay from '@/lib/wpr/WprReplay';
import {launchBrowser, prepareBrowserLaunchOptions} from './browser';
import {getPageMetrics} from './metrics';
import {createPage, preparePageProfile} from './page';

const bros: puppeteer.Browser[] = [];
const wprReplays: WprReplay[] = [];

export async function runPuppeteerCheck(
    site: ISite,
    siteIndex: number,
    options: ICheckOptions,
): Promise<(IOriginalMetrics|null)> {
    const {compareId, comparison, config} = options;

    // Different browsers for different sites can avoid cache and connection reuse between them
    if (!bros[siteIndex]) {
        if (config.puppeteerOptions.useWpr) {
            if (!comparison.wprArchives || !comparison.wprArchives[siteIndex]) {
                throw new Error(`no wprArchives for comparison: ${comparison.name} for siteIndex: ${siteIndex}`);
            }

            const wprArchiveId = comparison.wprArchives[siteIndex].wprArchiveId;

            const [httpPort, httpsPort] = await findTwoFreePorts();
            const comparisonDir = getComparisonDir(config.workDir, comparison);

            const wprReplay = await createWprReplayProcess({
                httpPort,
                httpsPort,
                stdoutFilepath: getWprReplayStdoutFilepath(comparisonDir, site, compareId, wprArchiveId),
                stderrFilepath: getWprReplayStderrFilepath(comparisonDir, site, compareId, wprArchiveId),
                wprArchiveFilepath: getWprArchiveFilepath(comparisonDir, site, wprArchiveId),
            });
            wprReplays[siteIndex] = wprReplay;

            const launchOptions = {
                ...prepareBrowserLaunchOptions(config),
                wpr: {httpPort, httpsPort},
            };

            const [browser] = await Promise.all([launchBrowser(launchOptions), wprReplay.start()]);
            bros[siteIndex] = browser;

            // warmIterations
            if (options.warmIterations) {
                logger.trace(`warm page before compare: iterations=${options.warmIterations}`);
                const pageProfile = preparePageProfile(config);

                for (let i = 0; i < options.warmIterations; i++) {
                    const page = await createPage(browser, pageProfile);
                    await page.close();
                }
            }

        } else {
            bros[siteIndex] = await launchBrowser(prepareBrowserLaunchOptions(config));
        }
    }

    const bro = bros[siteIndex];

    try {
        const pageProfile = preparePageProfile(config);
        const page = await createPage(bro, pageProfile);

        await page.goto(site.url, {waitUntil: config.puppeteerOptions.waitUntil});

        const pageMetrics = await getPageMetrics(page);

        let customMetrics = {};

        if (config.hooks && config.hooks.onCollectMetrics) {
            logger.trace(`[onCollectMetrics hook] collect custom metrics for site ${site.name} (${site.url})`);
            customMetrics = await config.hooks.onCollectMetrics({logger, page, comparison, site});
        }

        await page.close();

        return {
            ...pageMetrics,
            ...customMetrics,
        };
    } catch (e) {
        // This error appears when wpr replay not ready, but browser already open page
        if (/WebSocket is not open/.exec(e.message)) {
            logger.debug(e);
        } else {
            logger.error(e);
        }

        await bros[siteIndex].close();
        delete bros[siteIndex];
        return null;
    }
}

function closeBrowsers() {
    return Promise.all(bros.map((bro) => bro.close()));
}

function closeWprReplays() {
    return Promise.all(wprReplays.map((wpr) => wpr.kill()));
}

export function close() {
    return Promise.all([closeBrowsers(), closeWprReplays()]);
}
