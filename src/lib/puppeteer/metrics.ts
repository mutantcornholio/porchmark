import {IOriginalMetrics} from '@/types';
import puppeteer from 'puppeteer';

export const getPageMetrics = (page: puppeteer.Page): Promise<IOriginalMetrics> => {
    return page.evaluate(() => {
        const timings = performance.getEntriesByType('navigation')[0].toJSON();
        const paintEntries = performance.getEntriesByType('paint');
        for (const entry of paintEntries) {
            timings[entry.name] = entry.startTime;
        }
        return timings;
    });
};
