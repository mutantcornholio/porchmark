import * as path from 'path';
import puppeteer, {EvaluateFn, EvaluateFnReturnType, SerializableOrJSHandle} from 'puppeteer';
import rehypeParse = require('rehype-parse');
import traverse = require('traverse');
import unified = require('unified');

import {Logger} from '@/lib/logger';

import {ISite, OriginalMetrics} from '@/types';

import NETWORK_PRESETS from './networkPresets';
import {IPageProfile, IPageStructureSizes, IPageStructureSizesHooks} from './types';

export const DEFAULT_PAGE_NAVIGATION_TIMEOUT = 60000;

export default class PuppeteerPage {
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

        if (this._profile.javascriptEnabled === false) {
            await this._page.setJavaScriptEnabled(false);
        }

        if (this._profile.cssFilesEnabled === false) {
            await this._page.setRequestInterception(true);

            this._page.on('request', (req) => {
                if (
                    req.resourceType() === 'stylesheet' ||
                    req.resourceType() === 'font' ||
                    req.resourceType() === 'image'
                ) {
                    req.abort();
                } else {
                    req.continue();
                }
            });
        }

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
            path: path.resolve(this._workDir, `${this._site.name}${postfix}_${(new Date()).toISOString()}.png`),
        });
    }

    public close() {
        return this.page.close();
    }

    public evaluate<T extends EvaluateFn>(
        pageFunction: T,
        ...args: SerializableOrJSHandle[]
    ): Promise<EvaluateFnReturnType<T>> {
        return this.page.evaluate(pageFunction, ...args);
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
            return performance.getEntries().map((e) => e.toJSON());
        });
    }

    public getHTML(): Promise<string> {
        return this.page.evaluate(() => {
            return document.documentElement.outerHTML;
        });
    }

    public async getPageStructureSizes(hooks: IPageStructureSizesHooks): Promise<IPageStructureSizes> {
        const html = await this.getHTML();

        const tree = unified()
            .use(rehypeParse)
            .parse(html);

        let incrementId = 1;

        // TODO types
        const elements: {[index: string]: any} = {};

        traverse(tree).forEach(function(node) {
            if (node && typeof node.type !== 'undefined' && typeof node.position !== 'undefined') {
                const id = incrementId;
                incrementId++;

                let parentId = null;

                if (this.parent) {
                    if (Array.isArray(this.parent.node) && this.parent.parent) {
                        parentId = this.parent.parent.node.id;
                    } else {
                        parentId = this.parent.node.id;
                    }
                }

                const updatedNode = {
                    id,
                    parentId,
                    ...node,
                };

                this.update(updatedNode);

                elements[id] = updatedNode;
            }
        });

        const sizes: IPageStructureSizes = {
            root: this._getNodeSizeInBytes(html, elements[1]),
            script: 0,
            style: 0,
            scripts: {},
        };

        Object.keys(elements).forEach((id) => {
            const node = elements[id];

            if (hooks && hooks.onPageStructureSizesNode) {
                hooks.onPageStructureSizesNode(sizes, node);
            }

            if (node.tagName === 'script') {
                const size = this._getNodeSizeInBytes(html, node);
                sizes.script += size;

                const scriptType = node.properties && node.properties.type;

                if (!sizes.scripts[scriptType]) {
                    sizes.scripts[scriptType] = 0;
                }

                sizes.scripts[scriptType] += size;
            }

            if (node.tagName === 'style') {
                const size = this._getNodeSizeInBytes(html, node);
                sizes.style += size;
            }
        });

        if (hooks && hooks.onPageStructureSizesComplete) {
            hooks.onPageStructureSizesComplete(sizes, html, this._getSizeInBytes);
        }

        return  sizes;
    }

    private _getNodeSizeInBytes(html: string, node: any) {
        return Buffer.byteLength(html.substring(node.position.start.offset, node.position.end.offset), 'utf8');
    }

    private _getSizeInBytes = (html: string, start: number, end: number) => {
        return Buffer.byteLength(html.substring(start, end), 'utf8');
    }
}
