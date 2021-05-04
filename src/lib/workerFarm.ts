import {
    IOriginalMetrics,
} from '@/types';

import {IComparison, IConfig} from '@/lib/config';
import {DataProcessor} from '@/lib/dataProcessor';
import {indexOfMin, sleep} from '@/lib/helpers';
import {getLogger} from '@/lib/logger';
import {close, runPuppeteerCheck} from '@/lib/puppeteer';
import {getView} from '@/lib/view';
import {runWebdriverCheck} from '@/lib/webdriverio';

const logger = getLogger();
const view = getView();

const workerSet = new Set();

let waitForCompleteInterval: NodeJS.Timeout;

function waitForComplete(check: () => boolean): Promise<void> {
    return new Promise((resolve) => {
        waitForCompleteInterval = setInterval(() => {
            if (check()) {
                resolve();
            }
        }, 100);
    });
}

function clearWaitForComplete() {
    clearInterval(waitForCompleteInterval);
}

export default async function startWorking(
    compareId: number,
    comparision: IComparison,
    dataProcessor: DataProcessor,
    config: IConfig,
) {
    let workersDone = 0;

    logger.info(`[startWorking] start: comparison=${comparision.name} id=${compareId}`);

    const runCheck = (config.mode === 'webdriver' ? runWebdriverCheck : runPuppeteerCheck);

    const totalIterationCount = config.mode === 'puppeteer' && config.puppeteerOptions.useWpr
        ? config.iterations * (compareId + 1)
        : config.iterations;

    function getNextSiteIndex(): (number|null) {
        if (dataProcessor.getLeastIterations() >= totalIterationCount) {
            return null;
        }

        const totalTests = [];
        for (let siteIndex = 0; siteIndex < dataProcessor.sites.length; siteIndex++) {
            totalTests[siteIndex] = dataProcessor.iterations[siteIndex] + dataProcessor.activeTests[siteIndex];
        }

        return indexOfMin(totalTests);
    }

    // Controls the number of workers, spawns new ones, stops process when everything's done
    async function populateWorkers() {
        while (workersDone < config.workers) {
            while (config.workers - workersDone > workerSet.size) {
                const nextSiteIndex = getNextSiteIndex();

                if (nextSiteIndex === null) {
                    workersDone++;
                    continue;
                }

                const job = runWorker(nextSiteIndex, comparision, config).catch(handleWorkerError);

                workerSet.add(job);
                dataProcessor.reportTestStart(nextSiteIndex, job);

                const clearJob = () => { workerSet.delete(job); };
                job.then(clearJob, clearJob);
            }

            await Promise.race(Array.prototype.slice.call(workerSet.entries()).concat(sleep(100)));
        }

        // render last results
        view.renderTable(dataProcessor.calculateResults());

        logger.info(
            `[startWorking] complete: comparison=${comparision.name}, id=${compareId}, workersDone=${workersDone}`,
        );
    }

    function handleWorkerError(error: Error): void {
        logger.error(error);
    }

    function registerMetrics([originalMetrics, siteIndex]: [IOriginalMetrics, number]): void {
        const transformedMetrics: number[] = [];

        logger.trace('workerFarm registerMetrics:', siteIndex, originalMetrics);

        for (let metricIndex = 0; metricIndex < config.metrics.length; metricIndex++) {
            const metricName = config.metrics[metricIndex].name;
            logger.trace(`workerFarm registerMetrics: ${metricIndex}, ${metricName}, ${originalMetrics[metricName]}`);
            transformedMetrics[metricIndex] = originalMetrics[metricName];
        }

        logger.trace(`workerFarm registerMetrics: transformedMetrics ${transformedMetrics}`);

        dataProcessor.registerMetrics(siteIndex, transformedMetrics);
    }

    async function runWorker(
        siteIndex: number,
        workerComparision: IComparison,
        workerConfig: IConfig,
    ): Promise<void> {
        const workerSites = workerComparision.sites;

        const metrics = await Promise.race([
            sleep(workerConfig.pageTimeout).then(() => {
                throw new Error(`Timeout on site #${siteIndex}, ${workerSites[siteIndex].url}`);
            }),
            runCheck(workerSites[siteIndex], siteIndex, {
                comparison: workerComparision,
                config: workerConfig,
                compareId,
                warmIterations: config.puppeteerOptions.warmIterations,
            }),
        ]);

        if (metrics !== null) {
            registerMetrics([metrics, siteIndex]);
        }
    }

    populateWorkers().catch((error) => {
        logger.error(error);
    });

    await waitForComplete(() => {
        return workersDone >= config.workers;
    });

    clearWaitForComplete();

    if (config.mode === 'puppeteer') {
        await close();
    }
}
