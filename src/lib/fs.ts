import {IComparison} from '@/lib/config';
import {IReport} from '@/lib/dataProcessor';
import {ISite} from '@/types';
import cTable = require('console.table');
import * as fs from 'fs-extra';
import * as path from 'path';

export const getConfigFilepath = (workDir: string, name: string) => {
    return path.resolve(workDir, `${name}.config.json`);
};

export const getComparisonDir = (workDir: string, comparison: IComparison) => {
    return path.resolve(workDir, comparison.name);
};

export const getWprRecordStdoutFilepath = (workDir: string, site: ISite, id: number) => {
    return path.resolve(workDir, `${site.name}-${id}.wpr_record.stdout.log`);
};

export const getWprRecordStderrFilepath = (workDir: string, site: ISite, id: number) => {
    return path.resolve(workDir, `${site.name}-${id}.wpr_record.stderr.log`);
};

export const getWprReplayStdoutFilepath = (workDir: string, site: ISite, id: number, wprArchiveId: number) => {
    return path.resolve(workDir, `${site.name}-${id}-${wprArchiveId}.wpr_replay.stdout.log`);
};

export const getWprReplayStderrFilepath = (workDir: string, site: ISite, id: number, wprArchiveId: number) => {
    return path.resolve(workDir, `${site.name}-${id}-${wprArchiveId}.wpr_replay.stderr.log`);
};

export const getWprArchiveFilepath = (workDir: string, site: ISite, id: number) => {
    return path.resolve(workDir, `${site.name}-${id}.wprgo`);
};

export const getPageStructureSizesFilepath = (workDir: string, site: ISite, wprArchiveId: number) => {
    return path.resolve(workDir, `${site.name}-${wprArchiveId}.page-structure-sizes.json`);
};

export const getPageStructureSizesAfterLoadedFilepath = (workDir: string, site: ISite, wprArchiveId: number) => {
    return path.resolve(workDir, `${site.name}-${wprArchiveId}.page-structure-sizes-after-loaded.json`);
};

export const getReportFilepath = (workDir: string, id: string) => {
    return path.resolve(workDir, `report-${id}.json`);
};

export const getHumanReportFilepath = (workDir: string, id: string) => {
    return path.resolve(workDir, `human-report-${id}.txt`);
};

export const saveJsonReport = async (workDir: string, report: IReport, id: string) => {
    const filepath = getReportFilepath(workDir, id);
    await fs.writeJson(filepath, report);
};

export const saveHumanReport = async (workDir: string, report: IReport, id: string) => {
    const filepath = getHumanReportFilepath(workDir, id);
    const table = cTable.getTable(report.headers, report.data);
    await fs.writeFile(filepath, table);
};
