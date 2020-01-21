import {IComparison, IConfig} from '@/lib/config';
import {DataProcessor} from '@/lib/dataProcessor';
import {getLogger} from '@/lib/logger';

import {getComparisonDir, saveHumanReport, saveJsonReport} from '@/lib/fs';
import {getView} from '@/lib/view';
import startWorking from '@/lib/workerFarm';
import {recordWprArchives} from '@/lib/wpr';
import {getWprArchives, selectWprArchives} from '@/lib/wpr/select';
import {ISelectedWprArchives} from '@/lib/wpr/types';

const logger = getLogger();
const view = getView();

export async function startComparison(config: IConfig, comparison: IComparison) {
    logger.info(`pid=${process.pid}`);

    const dataProcessor = new DataProcessor(config, comparison);

    const renderTableInterval = setInterval(() => {
        view.renderTable(dataProcessor.calculateResults());
    }, 200);

    if (
        config.mode === 'puppeteer' &&
        config.puppeteerOptions.useWpr &&
        config.stages.recordWpr
    ) {
        await recordWprArchives(comparison, config);
    }

    if (config.stages.compareMetrics) {
        let selectedWprArchives: ISelectedWprArchives[] = [];
        let cycleCount = 1;

        const withWpr = config.mode === 'puppeteer' && config.puppeteerOptions.useWpr;

        const comparisonDir = getComparisonDir(config.workDir, comparison);

        if (withWpr) {
            const wprArchives = await getWprArchives(comparisonDir, comparison.sites);

            selectedWprArchives = await selectWprArchives(
                config,
                wprArchives,
                comparison.sites,
            );

            cycleCount = selectedWprArchives.length;
        }

        for (let compareId = 0; compareId < cycleCount; compareId++) {
            logger.info(`start comparison name=${comparison.name}, id=${compareId}`);

            if (withWpr) {
                comparison.wprArchives = selectedWprArchives[compareId].wprArchives;
                logger.info(`start comparison with wpr archives: ${JSON.stringify(selectedWprArchives[compareId])}`);
            }

            try {
                await startWorking(compareId, comparison, dataProcessor, config).catch(view.emergencyShutdown);
            } catch (error) {
                logger.error(error);
            }
        }

        clearInterval(renderTableInterval);

        logger.info('save reports');

        const {humanReport, jsonReport} = await dataProcessor.calcReports(comparison.sites);

        await Promise.all([
            saveJsonReport(comparisonDir, jsonReport, 'total'),
            saveHumanReport(comparisonDir, humanReport, 'total'),
        ]);

        logger.info('complete');

        view.shutdown(false);
    }
}
