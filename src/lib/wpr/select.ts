import {IConfig} from '@/lib/config';
import {getPageStructureSizesFilepath} from '@/lib/fs';
import {getLogger} from '@/lib/logger';
import {ISelectedWprArchives, IWprArchive} from '@/lib/wpr/types';
import {ISite} from '@/types';
import * as fs from 'fs-extra';
import jstat = require('jstat');
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

export enum WprArchiveSizeTypes {
    WPR_ARCHIVE_SIZE,
    HTML_SIZE,
    INLINE_SCRIPT_SIZE,
}

const getWprArchiveSize = (wprArchive: IWprArchive, type: WprArchiveSizeTypes): number => {
    switch (type) {
        case WprArchiveSizeTypes.WPR_ARCHIVE_SIZE:
            return wprArchive.size;
        case WprArchiveSizeTypes.HTML_SIZE:
            return wprArchive.structureSizes.bytes;
        case WprArchiveSizeTypes.INLINE_SCRIPT_SIZE:
            return wprArchive.structureSizes.script;
        default:
            throw new Error(`unknown WprArchive size type: ${type}`);
    }
};

export async function selectWprArchivesSimple(
    wprs: IWprArchive[],
    sites: ISite[],
    count: number,
): Promise<ISelectedWprArchives[]> {
    const result: ISelectedWprArchives[] = [];

    for (let i = 0; i < count; i++) {
        const wprArchives: IWprArchive[] = [];

        for (const site of sites) {
            wprArchives.push(selectWprByWprArchiveId(wprs, site, i));
        }

        const selected: ISelectedWprArchives = {
            wprArchives,
            diff: wprArchives.length === 2
                ? getWprArchiveSize(wprArchives[0], WprArchiveSizeTypes.HTML_SIZE)
                    - getWprArchiveSize(wprArchives[1], WprArchiveSizeTypes.HTML_SIZE)
                : jstat.stdev(
                    wprArchives.map((wprArchive) => getWprArchiveSize(wprArchive, WprArchiveSizeTypes.HTML_SIZE)),
                    true,
                ),
        };

        result.push(selected);
    }

    return result;
}

function getAllCombinations(
    variant: IWprArchive[],
    siteIndex: number,
    wprArchivesBySite: IWprArchive[][],
    siteWprArchivesCount: number,
    wprArchiveSizeType: WprArchiveSizeTypes,
    result: ISelectedWprArchives[],
) {
    const nextSiteIndex = siteIndex + 1;

    const currentSiteWprArchives = wprArchivesBySite[siteIndex];
    const nextSiteWprArchives = wprArchivesBySite[nextSiteIndex];

    for (let i = 0; i < siteWprArchivesCount; i++) {
        if (!nextSiteWprArchives) {
            const wprArchives = [...variant, currentSiteWprArchives[i]];
            result.push({
                wprArchives,
                diff: wprArchives.length === 2
                    ? getWprArchiveSize(wprArchives[0], wprArchiveSizeType)
                        - getWprArchiveSize(wprArchives[1], wprArchiveSizeType)
                    : jstat.stdev(
                        wprArchives.map((wprArchive) => getWprArchiveSize(wprArchive, wprArchiveSizeType)),
                        true,
                    ),
            });
        } else {
            getAllCombinations(
                [...variant, currentSiteWprArchives[i]],
                nextSiteIndex,
                wprArchivesBySite,
                siteWprArchivesCount,
                wprArchiveSizeType,
                result,
            );
        }
    }

    return result;
}

export const selectClosestWprArchives = (
    wprArchives: IWprArchive[],
    sites: ISite[],
    wprArchiveSizeType: WprArchiveSizeTypes,
    count: number,
): ISelectedWprArchives[] => {
    const wprArchivesBySites: IWprArchive[][] = [];

    const siteNames = sites.map((site) => site.name);

    wprArchives.forEach((wprArchive) => {
        const siteIndex = siteNames.indexOf(wprArchive.siteName);

        if (siteIndex === -1) {
            return;
        }

        if (!wprArchivesBySites[siteIndex]) {
            wprArchivesBySites[siteIndex] = [];
        }

        wprArchivesBySites[siteIndex].push(wprArchive);
    });

    const combinations = getAllCombinations(
        [], 0, wprArchivesBySites, wprArchivesBySites[0].length, wprArchiveSizeType, [],
    );

    combinations.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));

    return combinations.slice(0, count);
};

export async function selectWprArchives(
    config: IConfig,
    wprs: IWprArchive[],
    sites: ISite[],
): Promise<ISelectedWprArchives[]> {
    switch (config.puppeteerOptions.selectWprMethod) {
        case 'simple':
            return selectWprArchivesSimple(wprs, sites, config.puppeteerOptions.selectWprCount);
        case 'closestByWprSize':
            return selectClosestWprArchives(
                wprs,
                sites,
                WprArchiveSizeTypes.WPR_ARCHIVE_SIZE,
                config.puppeteerOptions.selectWprCount,
            );
        case 'closestByHtmlSize':
            return selectClosestWprArchives(
                wprs,
                sites,
                WprArchiveSizeTypes.HTML_SIZE,
                config.puppeteerOptions.selectWprCount,
            );
        case 'closestByScriptSize':
            return selectClosestWprArchives(
                wprs,
                sites,
                WprArchiveSizeTypes.INLINE_SCRIPT_SIZE,
                config.puppeteerOptions.selectWprCount,
            );
        default:
            throw new Error(
                `unknown config.puppeteerOptions.selectWprCount: ${config.puppeteerOptions.selectWprCount}`,
            );
    }
}
