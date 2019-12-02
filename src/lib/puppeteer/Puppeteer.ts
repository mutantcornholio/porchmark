import puppeteer from 'puppeteer';

import {Logger} from '@/lib/logger';

import PuppeteerBrowser from './Browser';
import {IBrowserLaunchOptions} from './types';

export default class Puppeteer {
    protected _logger: Logger;

    constructor(logger: Logger) {
        this._logger = logger;
    }

    public async launch(options: IBrowserLaunchOptions) {
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

        this._logger.debug('starting browser', launchOptions);

        const browser = await puppeteer.launch(launchOptions);

        return new PuppeteerBrowser(this._logger, browser);
    }
}
