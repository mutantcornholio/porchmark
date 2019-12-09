import {IConfig} from '@/lib/config';
import {getPageStructureSizesFilepath} from '@/lib/fs';
import {getLogger} from '@/lib/logger';
import {ISelectedWprArchives, IWprArchive} from '@/lib/wpr/types';
import {ISite} from '@/types';
import * as fs from 'fs-extra';
import * as path from 'path';

const logger = getLogger();

const parseWprArchiveFilenameRegex = /(.*)-(\d+)\.wprgo/;

const getWprArchiveInfo = async (comparisonDir: string, filename: string): Promise<IWprArchive> => {
    const match = parseWprArchiveFilenameRegex.exec(filename);

    if (!match) {
        throw new Error(`can't parse wpr filename: ${filename}`);
    }

    const siteName = match[1];
    const wprArchiveId = Number(match[2]);

    const [stat, structureSizes] = await Promise.all([
        fs.stat(path.resolve(comparisonDir, filename)),
        fs.readJson(getPageStructureSizesFilepath(comparisonDir, {name: siteName, url: ''}, wprArchiveId))
            .catch((error) => {
                if (error.code === 'ENOENT') {
                    logger.warn(
                        `skip wpr for site=${siteName} wprArchiveId=${wprArchiveId}, no pageStructureSizes`,
                    );
                    return null;
                }

                throw error;
            }),
    ]);

    return {
        siteName,
        wprArchiveId,
        size: stat.size,
        structureSizes,
    };
};

export async function getWprArchives(comparisonDir: string, sites: ISite[]): Promise<IWprArchive[]> {
    const files = await fs.readdir(comparisonDir);
    const wprFiles = files.filter((filename: string) => /.*\.wprgo$/.exec(filename));
    const wprs = await Promise.all(wprFiles.map((filename) => getWprArchiveInfo(comparisonDir, filename)));

    const siteNames = sites.map((site) => site.name);
    return wprs.filter((wpr) => siteNames.includes(wpr.siteName) && wpr.structureSizes);
}

const selectWprByWprArchiveId = (wprs: IWprArchive[], site: ISite, wprArchiveId: number): IWprArchive => {
    const found = wprs.find((wpr) => wpr.siteName === site.name && wpr.wprArchiveId === wprArchiveId);

    if (!found) {
        throw new Error(`can't find wpr for site=${site.name}, wprArchiveId=${wprArchiveId}`);
    }

    return found;
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
