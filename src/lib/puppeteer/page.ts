import puppeteer from 'puppeteer';

import {IPuppeteerConfig} from '@/lib/config/types';
import {IPageProfile} from '@/lib/puppeteer/types';
import NETWORK_PRESETS from './networkPresets';

export interface IPreparePageProfileOptions {
    ignoreThrottling?: boolean;
}

export const preparePageProfile = (
    config: IPuppeteerConfig,
    prepareOptions: IPreparePageProfileOptions = {},
): IPageProfile => {
    const {browserProfile} = config;
    const options = config.puppeteerOptions;

    const addThrottling = !!(prepareOptions && prepareOptions.ignoreThrottling);

    return {
        userAgent: browserProfile.userAgent,
        width: browserProfile.width,
        height: browserProfile.height,
        cacheEnabled: addThrottling ? options.cacheEnabled : true,
        javascriptEnabled: options.javascriptEnabled,
        cssFilesEnabled: options.cssFilesEnabled,
        cpuThrottling: addThrottling ? options.cpuThrottling : null,
        networkThrottling: addThrottling ? options.networkThrottling : null,
        pageNavigationTimeout: options.pageNavigationTimeout,
    };
};

export const createPage = async (browser: puppeteer.Browser, profile: IPageProfile): Promise<puppeteer.Page> => {
    const page = await browser.newPage();

    if (profile.javascriptEnabled === false) {
        await page.setJavaScriptEnabled(false);
    }

    if (profile.cssFilesEnabled === false) {
        await page.setRequestInterception(true);

        page.on('request', (req) => {
            if (req.resourceType() === 'stylesheet') {
                req.abort();
            } else {
                req.continue();
            }
        });
    }

    page.setDefaultTimeout(profile.pageNavigationTimeout);

    const client = await page.target().createCDPSession();

    if (profile.networkThrottling) {
        await client.send('Network.enable');
        await client.send('Network.emulateNetworkConditions', NETWORK_PRESETS[profile.networkThrottling]);
    }

    if (profile.cpuThrottling) {
        await client.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuThrottling.rate });
    }

    if (profile.cacheEnabled != null) {
        await page.setCacheEnabled(profile.cacheEnabled);
    }

    if (profile.userAgent) {
        await page.setUserAgent(profile.userAgent);
    }

    if (profile.height && profile.width) {
        await page.setViewport({
            width: profile.width,
            height: profile.height,
        });
    }

    return page;
};
