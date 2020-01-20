import {DesiredCapabilities, Options as WDOptions, remote} from 'webdriverio';

import {IBrowserProfile} from '@/lib/config';
import {getLogger} from '@/lib/logger';
import {ICheckOptions, IOriginalMetrics, ISite} from '@/types';

const logger = getLogger();

export async function runWebdriverCheck(
    site: ISite,
    _: number,
    options: ICheckOptions,
): Promise<(IOriginalMetrics|null)> {
    const {config} = options;
    const browserProfile = config.browserProfile;

    const wdOptions = validateWDOptions(config.webdriverOptions);

    if (wdOptions.desiredCapabilities.browserName === 'chrome') {
        setChromeFlags(wdOptions.desiredCapabilities, browserProfile);
    }

    const {height, width} = browserProfile;

    try {
        const metrics = await remote(wdOptions)
            .init(wdOptions.desiredCapabilities)
            .setViewportSize({width, height})
            // @ts-ignore FIXME Property 'url' does not exist on type 'never'.
            .url(site.url)
            .execute(getMetricsFromBrowser);

        return metrics.value;

    } catch (e) {
        logger.error(e);
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
