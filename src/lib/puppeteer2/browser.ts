import puppeteer, {Browser} from 'puppeteer';

import {IPuppeteerConfig} from '@/lib/config/types';
import {getLogger} from '@/lib/logger';
import {IBrowserLaunchOptions} from '@/lib/puppeteer2/types';

const logger = getLogger();

export const prepareBrowserLaunchOptions = (config: IPuppeteerConfig): IBrowserLaunchOptions => {
    const {headless, ignoreHTTPSErrors, imagesEnabled} = config.puppeteerOptions;
    return {
        headless,
        ignoreHTTPSErrors,
        imagesEnabled,
        wpr: null,
    };
};

export const launchBrowser = (options: IBrowserLaunchOptions): Promise<Browser> => {
    const args: string[] = [];

    if (options.wpr) {
        args.push(
            '--ignore-certificate-errors-spki-list=PhrPvGIaAMmd29hj8BCZOq096yj7uMpRNHpn5PDxI6I=',
            `--host-resolver-rules="MAP *:80 127.0.0.1:${options.wpr.httpPort},` +
            `MAP *:443 127.0.0.1:${options.wpr.httpsPort},EXCLUDE localhost"`,
        );
    }

    if (options.imagesEnabled === false) {
        args.push('--blink-settings=imagesEnabled=false');
    }

    const launchOptions = {
        headless: options.headless,
        ignoreHTTPSErrors: options.ignoreHTTPSErrors,
        args,
    };

    logger.debug('starting browser', launchOptions);

    return puppeteer.launch(launchOptions);
};
