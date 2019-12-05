import puppeteer from 'puppeteer';

import {IConfig} from '@/lib/config';
import {viewConsole} from '@/lib/view';
import {OriginalMetrics} from '@/types';

import {launchBrowser, prepareBrowserLaunchOptions} from './browser';
import {getPageMetrics} from './metrics';
import {createPage, preparePageProfile} from './page';

const bros: puppeteer.Browser[] = [];

export async function runPuppeteerCheck(
    site: string,
    siteIndex: number,
    config: IConfig,
): Promise<(OriginalMetrics|null)> {
    // Different browsers for different sites can avoid cache and connection reuse between them
    if (!bros[siteIndex]) {
        bros[siteIndex] = await launchBrowser(prepareBrowserLaunchOptions(config));
    }

    const bro = bros[siteIndex];

    try {
        const pageProfile = preparePageProfile(config);
        const page = await createPage(bro, pageProfile);

        await page.goto(site, {waitUntil: 'networkidle0'});

        const metrics = await getPageMetrics(page);
        await page.close();
        return metrics;
    } catch (e) {
        viewConsole.error(e);
        await bros[siteIndex].close();
        delete bros[siteIndex];
        return null;
    }
}

export function closeBrowsers() {
    return Promise.all(bros.map((bro) => bro.close()));
}
