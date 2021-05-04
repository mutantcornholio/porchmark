#!/usr/bin/env node
import 'source-map-support/register';

import path from 'path';

import program, {Command} from 'commander';

import {createLogger, setLogfilePath, setLogger} from '@/lib/logger';

// setLogger should be before resolveConfig import
const logger = createLogger();
setLogger(logger);

import {startComparison} from '@/lib/comparison';
import {resolveConfig, saveConfig} from '@/lib/config';
import {getView} from '@/lib/view';

const view = getView();

process.on('unhandledRejection', (e) => {
    logger.error(e);
    process.exit(1);
});
process.on('SIGINT', () => view.shutdown(false));
process.on('SIGTERM', () => view.shutdown(false));

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

        view.init();

        const logfilePath = path.resolve(config.workDir, 'porchmark.log');

        setLogfilePath(logfilePath);

        await saveConfig(logger, config);

        logger.info('config', config);

        for (const comparison of config.comparisons) {
            await startComparison(config, comparison);
        }

        view.shutdown(false);
    })
    .parse(process.argv);
