import puppeteer from 'puppeteer';

import {
    DEFAULT_MOBILE_USER_AGENT,
    DEFAULT_MOBILE_VIEWPORT_HEIGHT,
    DEFAULT_MOBILE_VIEWPORT_WIDTH,
    DEFAULT_VIEWPORT_HEIGHT, DEFAULT_VIEWPORT_WIDTH,
} from '@/lib/config/default';
import {IPuppeteerConfig} from '@/lib/config/types';
import {IPageProfile} from '@/lib/puppeteer/types';
import NETWORK_PRESETS from './networkPresets';

export const preparePageProfile = (config: IPuppeteerConfig): IPageProfile => {
    const {browserProfile} = config;
    const {mobile} = browserProfile;
    const options = config.puppeteerOptions;

    const userAgent = mobile ? DEFAULT_MOBILE_USER_AGENT : browserProfile.userAgent;
    const width = mobile ? DEFAULT_MOBILE_VIEWPORT_WIDTH : browserProfile.width;
    const height = mobile ? DEFAULT_MOBILE_VIEWPORT_HEIGHT : browserProfile.height;

    return {
        userAgent,
        width: width || DEFAULT_VIEWPORT_WIDTH,
        height: height || DEFAULT_VIEWPORT_HEIGHT,
        cacheEnabled: options.cacheEnabled,
        javascriptEnabled: options.javascriptEnabled,
        cssFilesEnabled: options.cssFilesEnabled,
        cpuThrottling: options.cpuThrottling,
        networkThrottling: options.networkThrottling,
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
