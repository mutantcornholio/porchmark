import {Command} from 'commander';
import path from 'path';

import {IComparison, IConfig, IPartialConfig, mergeWithDefaults, validateConfig} from '@/lib/config';

import {getLogger} from '@/lib/logger';
import joi from '@hapi/joi';

const logger = getLogger();

export interface ICompareMetricsArgv {
    iterations?: number;
    parallel?: number;
    mobile?: boolean;
    insecure?: boolean;
    timeout?: number;
    config?: string;
}

export const defaultDesktopProfile = {
    height: 768,
    width: 1366,
};

export const defaultMobileProfile = {
    userAgent: 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/76.0.3809.100 Mobile Safari/537.36',
    height: 667,
    width: 375,
};

export function readConfig(configPath: string): IPartialConfig {
    try {
        const config = require(configPath);
        return config as IPartialConfig;
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            logger.fatal(`invalid config at path ${configPath}: ${e.stack}`);
            return process.exit(1);
        }

        return {};
    }
}

export async function resolveConfig(commanderArgv: Command): Promise<IConfig> {
    const porchmarkConfPath = path.resolve(process.cwd(), 'porchmark.conf.js');

    let configPath = '';

    let rawConfig: IPartialConfig = {};

    if (typeof commanderArgv.config === 'string') {
        // config option
        rawConfig = readConfig(commanderArgv.config);
        configPath = commanderArgv.config;
    } else {
        // porchmark.conf.js exists
        rawConfig = readConfig(porchmarkConfPath);
        configPath = porchmarkConfPath;
    }

    const config = mergeWithDefaults(rawConfig);

    if (!config.workDir) {
        config.workDir = process.cwd();
    }

    if (typeof commanderArgv.mobile === 'boolean') {
        config.browserProfile.mobile = commanderArgv.mobile;
    }

    addOptsFromArgv(config, commanderArgv as ICompareMetricsArgv);
    addSitesFromArgv(config, commanderArgv);
    initBrowserProfile(config);

    try {
        await validateConfig(config);
    } catch (error) {
        // @ts-ignore
        if (error instanceof joi.ValidationError) {
            logger.fatal(`invalid config ${configPath ? `file=${configPath}` : ''}`);

            error.details.forEach((e: any) => {
                logger.fatal(`path=${e.path.join('.')}, ${e.message}`);
            });
        } else {
            logger.fatal(error);
        }

        process.exit(1);
    }

    return config;
}

function addOptsFromArgv(config: IConfig, commanderArgv: ICompareMetricsArgv) {
    if (typeof commanderArgv.iterations === 'number') {
        config.iterations = commanderArgv.iterations;
    }

    if (typeof commanderArgv.parallel === 'number') {
        config.workers = commanderArgv.parallel;
    }

    if (typeof commanderArgv.insecure === 'boolean') {
        config.puppeteerOptions.ignoreHTTPSErrors = commanderArgv.insecure;
    }

    if (typeof commanderArgv.timeout === 'number') {
        config.pageTimeout = commanderArgv.timeout;
    }
}

function addSitesFromArgv(config: IConfig, cmd: Command) {
    const sites: string[] = cmd.args;

    if (sites && sites.length) {
        const comparison: IComparison = {
            name: 'compare',
            sites: sites.map((url, index) => ({
                name: `site${index}`,
                url,
            })),
        };

        config.comparisons = [
            comparison,
        ];
    }
}

function initBrowserProfile(config: IConfig) {
    let browserProfile = config.browserProfile;
    if (browserProfile.mobile) {
        browserProfile = {
            ...browserProfile,
            ...defaultMobileProfile,
        };
    }

    if (!browserProfile.width || !browserProfile.height) {
        browserProfile = {
            ...defaultDesktopProfile,
            ...browserProfile,
        };
    }

    config.browserProfile = browserProfile;
}
