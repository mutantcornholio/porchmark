import puppeteer, {Page} from 'puppeteer';

import {Options} from '@/bin/porchmark';
import {OriginalMetrics} from '@/types';
import {console as viewConsole} from '@/lib/view';

let bros: puppeteer.Browser[] = [];

export async function runCheck(site: string, siteIndex: number, options: Options): Promise<OriginalMetrics> {
    // Different browsers for different sites can avoid cache and connection reusage between them
    if (!bros[siteIndex]) {
        bros[siteIndex] = await puppeteer.launch({
            headless: true,
            ignoreHTTPSErrors: options.insecure,
        });
    }

    const bro = bros[siteIndex];

    let metrics;

    try {
        const page = await bro.newPage();

        if (options.mobile) {
            await page.setUserAgent('Mozilla/5.0 (Linux; Android 8.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0' +
                ' Focus/1.3 Chrome/61.0.3163.81 Mobile Safari/537.36');
            await page.setViewport({width: 1080, height: 1920, deviceScaleFactor: 2, hasTouch: true});
        } else {
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)' +
                ' Chrome/60.0.3112.113 Safari/537.36');
            await page.setViewport({width: 1366, height: 768});
        }

        await page.goto(site, {waitUntil: 'networkidle0'});

        metrics = await getMetrics(page);
        await page.close();
    } catch (e) {
        viewConsole.error(e);
        await bros[siteIndex].close();
        delete bros[siteIndex];
        return runCheck(site, siteIndex, options);
    }

    return metrics;
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
