import path from 'path';

import {getLogger} from '@/lib/logger';

import {IWprConfig, IWprProcessOptions} from './types';
import WprRecord from './WprRecord';
import WprReplay from './WprReplay';

const logger = getLogger();

const rootDir = path.resolve(__dirname, '../../..');
const wprToolDir = path.resolve(`${rootDir}/wpr`);

export const createWprRecordProcess = (options: IWprProcessOptions) => {
    const config: IWprConfig = {
        ...options,
        bin: path.resolve(wprToolDir, `wpr`),
        certFile: path.resolve(wprToolDir, 'wpr_cert.pem'),
        keyFile: path.resolve(wprToolDir, 'wpr_key.pem'),
        injectScripts: path.resolve(wprToolDir, 'deterministic.js'),
    };

    return new WprRecord(logger, config);
};

export const createWprReplayProcess = (options: IWprProcessOptions) => {
    const config: IWprConfig = {
        ...options,
        bin: path.resolve(wprToolDir, `wpr`),
        certFile: path.resolve(wprToolDir, 'wpr_cert.pem'),
        keyFile: path.resolve(wprToolDir, 'wpr_key.pem'),
        injectScripts: path.resolve(wprToolDir, 'deterministic.js'),
    };

    return new WprReplay(logger, config);
};
