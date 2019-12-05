import {ISite} from '@/types';
import * as path from 'path';

export const getConfigFilepath = (workDir: string, name: string) => {
    return path.resolve(workDir, `${name}.config.json`);
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
