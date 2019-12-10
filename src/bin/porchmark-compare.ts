#!/usr/bin/env node
import 'source-map-support/register';

import path from 'path';

import program, {Command} from 'commander';

import {createLogger, setLogfilePath, setLogger} from '@/lib/logger';

// setLogger should be before resolveConfig import
const logger = createLogger();
setLogger(logger);

import {IComparison, IConfig, resolveConfig} from '@/lib/config';
import {DataProcessor} from '@/lib/dataProcessor';

import {getComparisonDir, saveHumanReport, saveJsonReport} from '@/lib/fs';
import {getView, getViewConsole} from '@/lib/view';
// import {destroyScreenAndLogResults, emergencyShutdown, shutdown} from '@/lib/view';
// import {viewConsole} from '@/lib/view';
import startWorking from '@/lib/workerFarm';
import {recordWprArchives} from '@/lib/wpr';
import {getWprArchives, selectWprArchives} from '@/lib/wpr/select';
import {ISelectedWprArchives} from '@/lib/wpr/types';

const view = getView();
const viewConsole = getViewConsole();

process.on('unhandledRejection', (e) => {
    logger.error(e);
    process.exit(1);
});
process.on('SIGINT', () => view.shutdown(false));
process.on('SIGTERM', () => view.shutdown(false));

async function startComparison(config: IConfig, comparison: IComparison) {
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

        const dataProcessor = new DataProcessor(config, comparison);

        const renderTableInterval = setInterval(() => {
            view.renderTable(dataProcessor.calculateResults());
        }, 200);

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

        const {humanReport, jsonReport} = await dataProcessor.calcReports(comparison.sites);

        await Promise.all([
            saveJsonReport(comparisonDir, jsonReport, 'total'),
            saveHumanReport(comparisonDir, humanReport, 'total'),
        ]);
    }
}

program
    .description('realtime compare websites')
    .option('-i, --iterations <n>', 'stop after n iterations; defaults to 300', parseInt)
    .option('-P, --parallel <n>', 'run checks in n workers; defaults to 1', parseInt)
    .option('-m, --mobile', 'chrome mobile UA, iphone 6-like screen, touch events, etc.')
    .option('-k, --insecure', 'ignore HTTPS errors')
    .option('-t, --timeout <n>', 'timeout in seconds for each check; defaults to 20s', parseInt)
    .option('-c  --config [configfile.js]', 'path to config; default is `porchmark.conf.js` in current dir')
    .option(
        '-v, --verbose',
        'verbose logging, -v (debug), -vv (trace)',
        function increaseVerbosity(_: number, previous: number) {
            return previous + 1;
        },
        0,
    )
    .action(async function(cmd: Command) {
        const config = await resolveConfig(cmd);

        view.config = config;

        const logfilePath = path.resolve(config.workDir, 'porchmark.log');

        setLogfilePath(logfilePath);

        for (const comparison of config.comparisons) {
            await startComparison(config, comparison);
        }

        view.shutdown(false);
    })
    .parse(process.argv);
