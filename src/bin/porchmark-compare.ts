#!/usr/bin/env node
import 'source-map-support/register';

import path from 'path';

import program, {Command} from 'commander';

import {createLogger, setLogfilePath, setLogger, setLogToConsole} from '@/lib/logger';

// setLogger should be before resolveConfig import
const logger = createLogger();
setLogger(logger);

import {resolveConfig} from '@/lib/config';
import {DataProcessor} from '@/lib/dataProcessor';

import * as view from '@/lib/view';
import {emergencyShutdown, shutdown} from '@/lib/view';
import startWorking from '@/lib/workerFarm';
import {recordWprArchives} from '@/lib/wpr';

program
    .description('realtime compare websites')
    .option('-i, --iterations <n>', 'stop after n iterations; defaults to 300', parseInt)
    .option('-P, --parallel <n>', 'run checks in n workers; defaults to 1', parseInt)
    .option('-m, --mobile', 'chrome mobile UA, iphone 6-like screen, touch events, etc.')
    .option('-k, --insecure', 'ignore HTTPS errors')
    .option('-t, --timeout <n>', 'timeout in seconds for each check; defaults to 20s', parseInt)
    .option('-c  --config [configfile.js]', 'path to config; default is `porchmark.conf.js` in current dir')
    .action(async function(cmd: Command) {
        const config = await resolveConfig(cmd);

        const logfilePath = path.resolve(config.workDir, 'porchmark.log');

        setLogfilePath(logfilePath);

        // take only first comparision, TODO iterate over all comparisons
        const comparison = config.comparisons[0];

        if (
            config.mode === 'puppeteer' &&
            config.puppeteerOptions.useWpr &&
            config.stages.recordWpr
        ) {
            await recordWprArchives(comparison, config);
        }

        if (config.stages.compareMetrics) {
            if (config.mode === 'puppeteer' && config.puppeteerOptions.useWpr) {
                // TODO select wpr pairs here
                comparison.wprArchives = comparison.sites.map((site) => {
                    return {
                        siteName: site.name,
                        wprArchiveId: 0,
                        size: 0,
                    };
                });

                logger.info(`start comparision with wpr archives`, comparison.wprArchives);
            }

            const dataProcessor = new DataProcessor(config, comparison);

            const renderTableInterval = setInterval(() => {
                view.renderTable(dataProcessor.calculateResults());
            }, 200);

            setLogToConsole(false);

            await startWorking(0, comparison, dataProcessor, config).catch(emergencyShutdown);

            setLogToConsole(true);

            clearInterval(renderTableInterval);

            shutdown(false);
        }
    })
    .parse(process.argv);
