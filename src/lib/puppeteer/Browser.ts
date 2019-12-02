import puppeteer from 'puppeteer';

import {Logger} from '@/lib/logger';
import {ISite} from '@/types';
import PuppeteerPage from './Page';
import {IPageProfile} from './types';

export default class PuppeteerBrowser {

    get browser() {
        return this._browser;
    }

    public static getMobileUserAgent() {
        return 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/76.0.3809.100 Mobile Safari/537.36';
    }

    public static getMobileViewport() {
        return {
            height: 667,
            width: 375,
        };
    }
    protected _logger: Logger;
    protected _browser: puppeteer.Browser;

    constructor(logger: Logger, browser: puppeteer.Browser) {
        this._logger = logger;
        this._browser = browser;
    }

    public createPage(workDir: string, profile: IPageProfile, site: ISite) {
        return new PuppeteerPage(this._logger, workDir, this._browser, profile, site);
    }

    public createMobilePage(workDir: string, profile: IPageProfile, site: ISite) {
        return new PuppeteerPage(this._logger, workDir, this._browser, {
            ...profile,
            ...PuppeteerBrowser.getMobileViewport(),
            userAgent: PuppeteerBrowser.getMobileUserAgent(),
        }, site);
    }

    public createDesktopOrMobilePage(mobile: boolean | undefined, workDir: string, profile: IPageProfile, site: ISite) {
        return mobile
            ? this.createMobilePage(workDir, profile, site)
            : this.createPage(workDir, profile, site);
    }

    public close() {
        return this._browser.close();
    }
}
