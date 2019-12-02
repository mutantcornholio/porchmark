#!/usr/bin/env node
import 'source-map-support/register';

import program, {Command} from 'commander';

import startWorking from '@/lib/workerFarm';
import {DataProcessor} from '@/lib/dataProcessor';
import * as view from '@/lib/view';
import {emergencyShutdown} from '@/lib/view';
import {resolveOptions} from '@/lib/options';

export type CompareMetricsArgv = {
    iterations?: number,
    parallel?: number,
    mobile?: boolean,
    insecure?: boolean,
    timeout?: number,
    config?: string,
}

program
    .description('realtime compare websites')
    .option('-i, --iterations <n>', 'stop after n iterations; defaults to 300', parseInt)
    .option('-P, --parallel <n>', 'run checks in n workers; defaults to 1', parseInt)
    .option('-m, --mobile', 'chrome mobile UA, iphone 6-like screen, touch events, etc.')
    .option('-k, --insecure', 'ignore HTTPS errors')
    .option('-t, --timeout <n>', 'timeout in seconds for each check; defaults to 20s', parseInt)
    .option('-c  --config [configfile.js]', 'path to config; default is `porchmark.conf.js` in current dir')
    .action(function (cmd: Command) {
        const sites: string[] = cmd.args;
        const options = resolveOptions(cmd as CompareMetricsArgv);

        const dataProcessor = new DataProcessor(sites, options);

        setInterval(() => {
            view.renderTable(dataProcessor.calculateResults());
        }, 200);

        startWorking(sites, dataProcessor, options).catch(emergencyShutdown);
    })
    .parse(process.argv);

