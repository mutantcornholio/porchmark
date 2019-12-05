import puppeteer, {Page} from 'puppeteer';

import {IConfig} from '@/lib/config';
import {viewConsole} from '@/lib/view';
import {OriginalMetrics} from '@/types';

const bros: puppeteer.Browser[] = [];

export async function runPuppeteerCheck(
    site: string,
    siteIndex: number,
    config: IConfig,
): Promise<(OriginalMetrics|null)> {
    const options = config.puppeteerOptions;

    // Different browsers for different sites can avoid cache and connection reuse between them
    if (!bros[siteIndex]) {
        bros[siteIndex] = await puppeteer.launch({
            headless: options.headless,
            ignoreHTTPSErrors: options.ignoreHTTPSErrors,
        });
    }

    const browserProfile = config.browserProfile; // resolveBrowserProfile(options);

    const bro = bros[siteIndex];

    try {
        const page = await bro.newPage();

        if (browserProfile.userAgent) {
            await page.setUserAgent(browserProfile.userAgent);
        }

        await page.setViewport({
            width: browserProfile.width,
            height: browserProfile.height,
        });

        await page.goto(site, {waitUntil: 'networkidle0'});

        const metrics = await getMetrics(page);
        await page.close();
        return metrics;
    } catch (e) {
        viewConsole.error(e);
        await bros[siteIndex].close();
        delete bros[siteIndex];
        return null;
    }
}

async function getMetrics(page: Page): Promise<OriginalMetrics> {
    return page.evaluate(() => {
        const timings = performance.getEntriesByType('navigation')[0].toJSON();
        const paintEntries = performance.getEntriesByType('paint');
        for (const entry of paintEntries) {
            timings[entry.name] = entry.startTime;
        }
        return timings;
    });
}
