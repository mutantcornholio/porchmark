import {IWpr} from '@/lib/wpr/types';
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

export async function getWprArchives(comparisonDir: string, sites: ISite[]): Promise<IWpr[]> {
    const files = await fs.readdir(comparisonDir);
    const wprFiles = files.filter((filename: string) => /.*\.wprgo$/.exec(filename));
    const wprs = await Promise.all(wprFiles.map((filename) => getWprArchiveInfo(comparisonDir, filename)));

    const siteNames = sites.map((site) => site.name);
    return wprs.filter((wpr) => siteNames.includes(wpr.siteName));
}
