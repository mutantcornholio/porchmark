import * as path from "path";
import puppeteer from "puppeteer";

import {Logger} from "@/lib/logger";
import {ISite, OriginalMetrics} from "@/types";

export const DEFAULT_PAGE_NAVIGATION_TIMEOUT = 60000;

export const NETWORK_PRESETS = {
    'GPRS': {
        'offline': false,
        'downloadThroughput': 50 * 1024 / 8,
        'uploadThroughput': 20 * 1024 / 8,
        'latency': 500
    },
    'Regular2G': {
        'offline': false,
        'downloadThroughput': 250 * 1024 / 8,
        'uploadThroughput': 50 * 1024 / 8,
        'latency': 300
    },
    'Good2G': {
        'offline': false,
        'downloadThroughput': 450 * 1024 / 8,
        'uploadThroughput': 150 * 1024 / 8,
        'latency': 150
    },
    'Regular3G': {
        'offline': false,
        'downloadThroughput': 750 * 1024 / 8,
        'uploadThroughput': 250 * 1024 / 8,
        'latency': 100
    },
    'Good3G': {
        'offline': false,
        'downloadThroughput': 1.5 * 1024 * 1024 / 8,
        'uploadThroughput': 750 * 1024 / 8,
        'latency': 40
    },
    'Regular4G': {
        'offline': false,
        'downloadThroughput': 4 * 1024 * 1024 / 8,
        'uploadThroughput': 3 * 1024 * 1024 / 8,
        'latency': 20
    },
    'DSL': {
        'offline': false,
        'downloadThroughput': 2 * 1024 * 1024 / 8,
        'uploadThroughput': 1 * 1024 * 1024 / 8,
        'latency': 5
    },
    'WiFi': {
        'offline': false,
        'downloadThroughput': 30 * 1024 * 1024 / 8,
        'uploadThroughput': 15 * 1024 * 1024 / 8,
        'latency': 2
    }
};

export interface IBrowserLaunchOptions {
    headless: boolean;
    ignoreHTTPSErrors: boolean;
    wpr: null | {
        httpPort: number;
        httpsPort: number;
    };
}

export type NETWORK_PRESET_TYPES =
    'GPRS' | 'Regular2G' | 'Good2G' |
    'Regular3G' | 'Good3G' | 'Regular4G' |
    'DSL' | 'WiFi';

export interface IPageProfile {
    userAgent: string | null;
    height: number | null;
    width: number | null;
    networkThrottling: null | NETWORK_PRESET_TYPES,
    cpuThrottling: null | {
        rate: number;
    };
    cacheEnabled: null | boolean;
    waitUntil: puppeteer.LoadEvent;
}

export class PuppeteerApi {
    protected _logger: Logger;

    constructor(logger: Logger) {
        this._logger = logger;
    }

    public async launch(options: IBrowserLaunchOptions) {
        const args: string[] = [];

        if (options.wpr) {
            args.push(
                '--ignore-certificate-errors-spki-list=PhrPvGIaAMmd29hj8BCZOq096yj7uMpRNHpn5PDxI6I=',
                `--host-resolver-rules="MAP *:80 127.0.0.1:${options.wpr.httpPort},MAP *:443 127.0.0.1:${options.wpr.httpsPort},EXCLUDE localhost"`,
            );
        }

        const launchOptions = {
            headless: options.headless,
            ignoreHTTPSErrors: options.ignoreHTTPSErrors,
            args,
        };

        this._logger.debug("starting browser", launchOptions);

        const browser = await puppeteer.launch(launchOptions);

        return new BrowserApi(this._logger, browser);
    }
}

export class BrowserApi {
    protected _logger: Logger;
    protected _browser: puppeteer.Browser;

    constructor(logger: Logger, browser: puppeteer.Browser) {
        this._logger = logger;
        this._browser = browser;
    }

    static getMobileUserAgent() {
        return "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/76.0.3809.100 Mobile Safari/537.36";
    }

    static getMobileViewport() {
        return {
            height: 667,
            width: 375,
        };
    }

    get browser() {
        return this._browser;
    }

    createPage(workDir: string, profile: IPageProfile, site: ISite) {
        // TODO log over cli.table
        // this._logger.debug('create desktop page', site.url);
        return new PageApi(this._logger, workDir, this._browser, profile, site);
    }

    createMobilePage(workDir: string, profile: IPageProfile, site: ISite) {
        // TODO log over cli.table
        // this._logger.debug('create mobile page', site.url);
        return new PageApi(this._logger, workDir, this._browser, {
            ...profile,
            ...BrowserApi.getMobileViewport(),
            userAgent: BrowserApi.getMobileUserAgent(),
        }, site);
    }

    createDesktopOrMobilePage(mobile: boolean | undefined, workDir: string, profile: IPageProfile, site: ISite) {
        return mobile
            ? this.createMobilePage(workDir, profile, site)
            : this.createPage(workDir, profile, site);
    }

    public close() {
        return this._browser.close();
    }
}


export class PageApi {
    protected _logger: Logger;
    protected _workDir: string;
    protected _browser: puppeteer.Browser;
    protected _profile: IPageProfile;
    protected _site: ISite;
    protected _page: puppeteer.Page | null = null;

    constructor(logger: Logger, workDir: string, browser: puppeteer.Browser, profile: IPageProfile, site: ISite) {
        this._logger = logger;
        this._workDir = workDir;
        this._browser = browser;
        this._profile = profile;
        this._site = site;
    }

    get page() {
        if (!this._page) { throw new Error(`browser page not exists`); }
        return this._page;
    }

    public async open() {
        // TODO log over cli.table
        // this._logger.debug('open page: ', this._site.url);

        this._page = await this._browser.newPage();

        this._page.setDefaultTimeout(DEFAULT_PAGE_NAVIGATION_TIMEOUT); // TODO move into options

        const client = await this.page.target().createCDPSession();

        if (this._profile.networkThrottling) {
            await client.send('Network.enable');
            await client.send('Network.emulateNetworkConditions', NETWORK_PRESETS[this._profile.networkThrottling]);
        }

        if (this._profile.cpuThrottling) {
            await client.send('Emulation.setCPUThrottlingRate', { rate: this._profile.cpuThrottling.rate });
        }

        if (this._profile.cacheEnabled != null) {
            await this.page.setCacheEnabled(this._profile.cacheEnabled);
        }

        if (this._profile.userAgent) {
            await this.page.setUserAgent(this._profile.userAgent);
        }

        if (this._profile.height && this._profile.width) {
            await this.page.setViewport({
                width: this._profile.width,
                height: this._profile.height,
            });
        }

        await this.page.goto(this._site.url, {waitUntil: this._profile.waitUntil});
    }

    public reload() {
        return this.page.reload();
    }

    public setCookie(cookie: puppeteer.SetCookie) {
        return this.page.setCookie(cookie);
    }

    public async screenshot(postfix: string = '') {
        await this.page.screenshot({
            fullPage: true,
            path: path.resolve(this._workDir, `${this._site.name}${postfix}_${(new Date()).toISOString()}.png`)
        });
    }

    public close() {
        return this.page.close();
    }

    public getMetrics(): Promise<OriginalMetrics> {
        return this.page.evaluate(() => {
            const timings = performance.getEntriesByType('navigation')[0].toJSON();
            const paintEntries = performance.getEntriesByType('paint');
            for (const entry of paintEntries) {
                timings[entry.name] = entry.startTime;
            }
            return timings;
        });
    }

    public getPerformanceEntries(): Promise<any> {
        return this.page.evaluate(() => {
            return performance.getEntries().map(e => e.toJSON());
        });
    }
}
