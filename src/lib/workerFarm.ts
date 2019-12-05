import {
    OriginalMetrics,
    watchingMetrics,
    watchingMetricsRealNames,
} from '@/types';

import {IComparison, IConfig} from '@/lib/config';
import {DataProcessor} from '@/lib/dataProcessor';
import {sleep} from '@/lib/helpers';
import {runPuppeteerCheck} from '@/lib/puppeteer';
import {shutdown, viewConsole} from '@/lib/view';
import {runWebdriverCheck} from '@/lib/webdriverio';

const workerSet = new Set();

export default async function startWorking(comparision: IComparison, dataProcessor: DataProcessor, config: IConfig) {
    let workersDone = 0;

    const sites = comparision.sites.map((site) => site.url);

    const runCheck = (config.mode === 'webdriver' ? runWebdriverCheck : runPuppeteerCheck);

    // Controls the number of workers, spawns new ones, stops process when everything's done
    async function populateWorkers() {
        while (workersDone < config.workers) {
            while (config.workers - workersDone > workerSet.size) {
                const nextSiteIndex = dataProcessor.getNextSiteIndex();

                if (nextSiteIndex === null) {
                    workersDone++;
                    continue;
                }

                const job = runWorker(nextSiteIndex, sites, config).catch(handleWorkerError);

                workerSet.add(job);
                dataProcessor.reportTestStart(nextSiteIndex, job);

                const clearJob = () => {workerSet.delete(job); };
                job.then(clearJob, clearJob);
            }

            await Promise.race(Array.prototype.slice.call(workerSet.entries()).concat(sleep(100)));
        }

        shutdown(false);
    }

    function handleWorkerError(error: Error): void {
        viewConsole.error(error);
    }

    function registerMetrics([originalMetrics, siteIndex]: [OriginalMetrics, number]): void {
        const transformedMetrics: number[] = [];

        for (let metricIndex = 0; metricIndex < watchingMetrics.length; metricIndex++) {
            const metricName = watchingMetricsRealNames[metricIndex];
            transformedMetrics[metricIndex] = originalMetrics[metricName];
        }

        dataProcessor.registerMetrics(siteIndex, transformedMetrics);
    }

    async function runWorker(siteIndex: number, workerSites: string[], workerConfig: IConfig): Promise<void> {
        const metrics = await Promise.race([
            sleep(workerConfig.pageTimeout * 1000).then(() => {
                throw new Error(`Timeout on site #${siteIndex}, ${workerSites[siteIndex]}`);
            }),
            runCheck(workerSites[siteIndex], siteIndex, workerConfig),
        ]);

        if (metrics !== null) {
            registerMetrics([metrics, siteIndex]);
        }
    }

    populateWorkers().catch(() => {
        // empty
    });
}
