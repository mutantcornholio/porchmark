import {IPageStructureSizes} from '@/lib/puppeteer/types';
import puppeteer from 'puppeteer';

export const getPageStructureSizes = (page: puppeteer.Page): Promise<IPageStructureSizes> => {
    return page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));

        const scriptsByType = scripts.reduce((acc, element) => {
            (acc[element.type] = acc[element.type] || []).push(element);
            return acc;
        }, {} as {[index: string]: HTMLScriptElement[]});

        return {
            bytes: new Blob(Array.from(document.documentElement.outerHTML)).size,
            script: new Blob(
                scripts.map((e) => e.outerHTML),
            ).size,
            style: new Blob(
                Array.from(document.querySelectorAll('style')).map((e) => e.outerHTML),
            ).size,
            scripts: Object.entries(scriptsByType).reduce((acc, [scriptType, _elements]) => {
                acc[scriptType] = new Blob(
                    _elements.map((element) => element.outerHTML),
                ).size;
                return acc;
            }, {} as {[index: string]: number}),
        };
    });
};
