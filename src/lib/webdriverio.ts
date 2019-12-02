import {DesiredCapabilities, Options as WDOptions, remote} from 'webdriverio';

import {IBrowserProfile, IOptions, resolveBrowserProfile} from '@/lib/options';
import {viewConsole} from '@/lib/view';
import {OriginalMetrics} from '@/types';

export async function runWebdriverCheck(site: string, _: number, options: IOptions): Promise<(OriginalMetrics|null)> {
    const browserProfile = resolveBrowserProfile(options);

    const wdOptions = validateWDOptions(options.webdriverOptions);

    if (wdOptions.desiredCapabilities.browserName === 'chrome') {
        setChromeFlags(wdOptions.desiredCapabilities, browserProfile);
    }

    const {height, width} = browserProfile;

    try {
        const metrics = await remote(wdOptions)
            .init(wdOptions.desiredCapabilities)
            .setViewportSize({width, height})
            // @ts-ignore FIXME Property 'url' does not exist on type 'never'.
            .url(site)
            .execute(getMetricsFromBrowser);

        return metrics.value;

    } catch (e) {
        viewConsole.error(e);
        return null;
    }
}

function getMetricsFromBrowser() {
    const timings = performance.getEntriesByType('navigation')[0].toJSON();
    const paintEntries = performance.getEntriesByType('paint');
    for (const entry of paintEntries) {
        timings[entry.name] = entry.startTime;
    }
    return timings;
}

type ValidWDOptions = WDOptions & {
    desiredCapabilities: DesiredCapabilities & {
        browserName: string,
        version: string,
    },
};

function validateWDOptions(options: WDOptions): ValidWDOptions {
    if (
        typeof options === 'object' &&
        typeof options.desiredCapabilities === 'object' &&
        typeof options.desiredCapabilities.browserName === 'string' &&
        typeof options.desiredCapabilities.version === 'string'
    ) {
        // @ts-ignore
        return options;
    }
    throw new TypeError('invalid desiredCapabilities object!');
}

function setChromeFlags(desiredCapabilities: DesiredCapabilities, browserProfile: IBrowserProfile) {
    if (!desiredCapabilities.chromeOptions) {
        desiredCapabilities.chromeOptions = {};
    }

    if (!desiredCapabilities.chromeOptions.args) {
        desiredCapabilities.chromeOptions.args = [];
    }

    if (browserProfile.userAgent) {
        desiredCapabilities.chromeOptions.args.push(`user-agent=${browserProfile.userAgent}`);
    }
}
