import path from 'path';

import {IBaseWprConfig, IWprConfig, IWprProcessOptions} from './types';
import WprRecord from './WprRecord';
import WprReplay from './WprReplay';

const rootDir = path.resolve(__dirname, '../../..');
const wprToolDir = path.resolve(`${rootDir}/wpr`);

const baseConfig: IBaseWprConfig = {
    bin: path.resolve(wprToolDir, `wpr`),
    certFile: path.resolve(wprToolDir, 'wpr_cert.pem'),
    keyFile: path.resolve(wprToolDir, 'wpr_key.pem'),
    injectScripts: path.resolve(wprToolDir, 'deterministic.js'),
};

export const createWprRecordProcess = (options: IWprProcessOptions) => {
    const config: IWprConfig = {
        ...baseConfig,
        ...options,
    };

    return new WprRecord(config);
};

export const createWprReplayProcess = (options: IWprProcessOptions) => {
    const config: IWprConfig = {
        ...baseConfig,
        ...options,
    };

    return new WprReplay(config);
};
