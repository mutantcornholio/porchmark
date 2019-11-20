import path from 'path';
import {merge} from 'lodash';
import {Options as WDOptions} from 'webdriverio';

import {viewConsole} from '@/lib/view';
import {CompareMetricsArgv as Argv} from '@/bin/porchmark';


export type BrowserProfile = {
    userAgent?: string,
    height: number,
    width: number,
    cookie?: string,
};

export const defaultDesktopProfile: BrowserProfile = {
    height: 768,
    width: 1366,
};

export const defaultMobileProfile: BrowserProfile = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)' +
        ' Chrome/60.0.3112.113 Safari/537.36',
    height: 1920,
    width: 1080,
};

export type Options = {
    maxIterations: number,
    workers: number,
    mobile: boolean,
    insecure: boolean,
    timeout: number,
    mode: ('puppeteer' | 'webdriver'),
    configPath: string,
    browserProfile: BrowserProfile,
    webdriverOptions: WDOptions,
}

export function resolveBrowserProfile(options: Options): BrowserProfile {
    return options.mobile ? defaultMobileProfile : defaultDesktopProfile;
}

export function resolveOptions(commanderArgv: Argv): Options {
    const configPath = typeof commanderArgv.config === 'string' ?
        commanderArgv.config : path.resolve(process.cwd(), 'porchmark.conf.js');

    const mobile = typeof commanderArgv.mobile === 'boolean' && commanderArgv.mobile;

    let resultOptions: Options = {
        maxIterations: 300,
        workers: 1,
        mobile,
        insecure: false,
        timeout: 20000,
        browserProfile: {...defaultDesktopProfile},
        mode: 'puppeteer',
        webdriverOptions: {},
        configPath: configPath,
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

function addValidConfigFields(resultOptions: Options, config: any) {
    typeof config.maxIterations === 'number' && (resultOptions.maxIterations = config.maxIterations);
    typeof config.workers === 'number' && (resultOptions.workers = config.workers);
    typeof config.mobile === 'boolean' && (resultOptions.mobile = config.mobile);
    typeof config.insecure === 'boolean' && (resultOptions.insecure = config.insecure);
    typeof config.timeout === 'boolean' && (resultOptions.timeout = config.timeout);

    if (config.mobile) {
        resultOptions.browserProfile = {...defaultMobileProfile};
    }


    if (config.browserProfile instanceof Object) {
        const bp = config.browserProfile;
        const defaultBp = resultOptions.browserProfile;

        typeof bp.userAgent === 'string' && (defaultBp.userAgent = bp.userAgent);
        typeof bp.height === 'number' && (defaultBp.height = bp.height);
        typeof bp.width === 'number' && (defaultBp.width = bp.width);
        typeof bp.cookie === 'string' && (defaultBp.cookie = bp.cookie);
    }

    if (config.webdriverOptions instanceof Object) {
        merge(resultOptions.webdriverOptions, config.webdriverOptions);
    }

    (config.mode === 'puppeteer' || config.mode === 'webdriver') && (resultOptions.mode = config.mode);

}

function addOptsFromArgv(resultOptions: Options, commanderArgv: Argv) {
    typeof commanderArgv.iterations === 'number' && (resultOptions.maxIterations = commanderArgv.iterations);
    typeof commanderArgv.parallel === 'number' && (resultOptions.workers = commanderArgv.parallel);
    typeof commanderArgv.insecure === 'boolean' && (resultOptions.insecure = commanderArgv.insecure);
    typeof commanderArgv.timeout === 'number' && (resultOptions.timeout = commanderArgv.timeout);
}
