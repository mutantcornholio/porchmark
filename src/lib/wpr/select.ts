import {IConfig} from '@/lib/config';
import {ISelectedWprArchives, IWprArchive} from '@/lib/wpr/types';
import {ISite} from '@/types';
import * as fs from 'fs-extra';
import * as path from 'path';

const parseWprArchiveFilenameRegex = /(.*)-(\d+)\.wprgo/;

const getWprArchiveInfo = async (comparisonDir: string, filename: string) => {
    const match = parseWprArchiveFilenameRegex.exec(filename);

    if (!match) {
        throw new Error(`can't parse wpr filename: ${filename}`);
    }

    const siteName = match[1];
    const wprArchiveId = Number(match[2]);

    // TODO get page structure sizes

    const stat = await fs.stat(path.resolve(comparisonDir, filename));

    return {
        filename,
        siteName,
        wprArchiveId,
        size: stat.size,
        // pageStructureSizes,
    };
};

export async function getWprArchives(comparisonDir: string, sites: ISite[]): Promise<IWprArchive[]> {
    const files = await fs.readdir(comparisonDir);
    const wprFiles = files.filter((filename: string) => /.*\.wprgo$/.exec(filename));
    const wprs = await Promise.all(wprFiles.map((filename) => getWprArchiveInfo(comparisonDir, filename)));

    const siteNames = sites.map((site) => site.name);
    return wprs.filter((wpr) => siteNames.includes(wpr.siteName));
}

const selectWprByWprArchiveId = (wprs: IWprArchive[], site: ISite, wprArchiveId: number): IWprArchive => {
    const found = wprs.filter((wpr) => wpr.siteName === site.name && wpr.wprArchiveId === wprArchiveId);

    if (!found.length) {
        throw new Error(`can't find wpr for site=${site.name}, wprArchiveId=${wprArchiveId}`);
    }

    return found[0];
};

export async function selectWprArchivesSimple(
    wprs: IWprArchive[],
    sites: ISite[],
    count: number,
): Promise<ISelectedWprArchives[]> {
    const result: ISelectedWprArchives[] = [];

    for (let i = 0; i < count; i++) {
        const selected: ISelectedWprArchives = {
            wprArchives: [],
            // wprArchiveSizeDiffs: [],
        };

        for (const site of sites) {
            selected.wprArchives.push(selectWprByWprArchiveId(wprs, site, i));
        }

        result.push(selected);
    }

    return result;
}

export async function selectWprArchives(
    config: IConfig,
    wprs: IWprArchive[],
    sites: ISite[],
): Promise<ISelectedWprArchives[]> {
    return selectWprArchivesSimple(wprs, sites, config.puppeteerOptions.selectWprCount);
}
