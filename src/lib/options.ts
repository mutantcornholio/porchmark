import {merge} from 'lodash';
import path from 'path';
import {Options as WDOptions} from 'webdriverio';

import {ICompareMetricsArgv as Argv} from '@/bin/porchmark-compare';
import {viewConsole} from '@/lib/view';

export interface IBrowserProfile {
    userAgent?: string;
    height: number;
    width: number;
    cookie?: string;
}

export const defaultDesktopProfile: IBrowserProfile = {
    height: 768,
    width: 1366,
};

export const defaultMobileProfile: IBrowserProfile = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)' +
        ' Chrome/60.0.3112.113 Safari/537.36',
    height: 1920,
    width: 1080,
};

export interface IOptions {
    maxIterations: number;
    workers: number;
    mobile: boolean;
    insecure: boolean;
    timeout: number;
    mode: ('puppeteer' | 'webdriver');
    configPath: string;
    browserProfile: IBrowserProfile;
    webdriverOptions: WDOptions;
}

export function resolveBrowserProfile(options: IOptions): IBrowserProfile {
    return options.mobile ? defaultMobileProfile : defaultDesktopProfile;
}

export function resolveOptions(commanderArgv: Argv): IOptions {
    const configPath = typeof commanderArgv.config === 'string' ?
        commanderArgv.config : path.resolve(process.cwd(), 'porchmark.conf.js');

    const mobile = typeof commanderArgv.mobile === 'boolean' && commanderArgv.mobile;

    const resultOptions: IOptions = {
        maxIterations: 300,
        workers: 1,
        mobile,
        insecure: false,
        timeout: 20000,
        browserProfile: {...defaultDesktopProfile},
        mode: 'puppeteer',
        webdriverOptions: {},
        configPath,
    };

    try {
        const config = require(resultOptions.configPath);
        addValidConfigFields(resultOptions, config);
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            viewConsole.error(`invalid config at path ${resultOptions.configPath}: ${e.stack}`);
        }
    }

    addOptsFromArgv(resultOptions, commanderArgv);

    return resultOptions;
}

function addValidConfigFields(resultOptions: IOptions, config: any) {
    // tslint:disable no-unused-expression
    typeof config.maxIterations === 'number' && (resultOptions.maxIterations = config.maxIterations);
    typeof config.workers === 'number' && (resultOptions.workers = config.workers);
    typeof config.mobile === 'boolean' && (resultOptions.mobile = config.mobile);
    typeof config.insecure === 'boolean' && (resultOptions.insecure = config.insecure);
    typeof config.timeout === 'boolean' && (resultOptions.timeout = config.timeout);
    // tslint:enable no-unused-expression

    if (config.mobile) {
        resultOptions.browserProfile = {...defaultMobileProfile};
    }

    if (config.browserProfile instanceof Object) {
        const bp = config.browserProfile;
        const defaultBp = resultOptions.browserProfile;

        // tslint:disable no-unused-expression
        typeof bp.userAgent === 'string' && (defaultBp.userAgent = bp.userAgent);
        typeof bp.height === 'number' && (defaultBp.height = bp.height);
        typeof bp.width === 'number' && (defaultBp.width = bp.width);
        typeof bp.cookie === 'string' && (defaultBp.cookie = bp.cookie);
        // tslint:enable no-unused-expression
    }

    if (config.webdriverOptions instanceof Object) {
        merge(resultOptions.webdriverOptions, config.webdriverOptions);
    }

    // tslint:disable-next-line no-unused-expression
    (config.mode === 'puppeteer' || config.mode === 'webdriver') && (resultOptions.mode = config.mode);

}

function addOptsFromArgv(resultOptions: IOptions, commanderArgv: Argv) {
    // tslint:disable no-unused-expression
    typeof commanderArgv.iterations === 'number' && (resultOptions.maxIterations = commanderArgv.iterations);
    typeof commanderArgv.parallel === 'number' && (resultOptions.workers = commanderArgv.parallel);
    typeof commanderArgv.insecure === 'boolean' && (resultOptions.insecure = commanderArgv.insecure);
    typeof commanderArgv.timeout === 'number' && (resultOptions.timeout = commanderArgv.timeout);
    // tslint:enable no-unused-expression
}
