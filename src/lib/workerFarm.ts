import {Options} from '@/bin/porchmark';
import {
    OriginalMetrics,
    watchingMetrics,
    watchingMetricsRealNames
} from '@/types';
import {DataProcessor} from '@/lib/dataProcessor';
import {runCheck} from '@/lib/browser';
import * as view from '@/lib/view';
import {sleep} from '@/lib/helpers';

const workerSet = new Set();


export default async function startWorking(sites: string[], dataProcessor: DataProcessor, options: Options) {
    let workersDone = 0;

    // Controls the number of workers, spawns new ones, stops process when everything's done
    async function populateWorkers() {
        while (workersDone < options.workers) {
            while(options.workers - workersDone > workerSet.size) {
                const nextSiteIndex = dataProcessor.getNextSiteIndex();

                if (nextSiteIndex === null) {
                    workersDone++;
                    continue;
                }

                const job = runWorker(nextSiteIndex, sites, options).catch(handleWorkerError);

                workerSet.add(job);
                dataProcessor.reportTestStart(nextSiteIndex, job);

                const clearJob = () => {workerSet.delete(job)};
                job.then(clearJob, clearJob);
            }

            await Promise.race(workerSet.entries());
            await sleep(100);
        }

        view.shutdown(false);
    }

    function handleWorkerError(error: Error): void {
        view.console.error(error);
    }

    function registerMetrics([originalMetrics, siteIndex]: [OriginalMetrics, number]): void {
        const transformedMetrics: number[] = [];

        for (let metricIndex = 0; metricIndex < watchingMetrics.length; metricIndex++) {
            const metricName = watchingMetricsRealNames[metricIndex];
            transformedMetrics[metricIndex] = originalMetrics[metricName];
        }

        dataProcessor.registerMetrics(siteIndex, transformedMetrics);
    }

    async function runWorker(siteIndex: number, sites: string[], options: Options): Promise<void> {
        const metrics = await runCheck(sites[siteIndex], siteIndex, options);

        registerMetrics([metrics, siteIndex]);
    }

    populateWorkers().catch(() => {});
}
