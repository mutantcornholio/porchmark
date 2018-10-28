#!/usr/bin/env node
import program from 'commander';

import startWorking from '@/lib/workerFarm';
import {DataProcessor} from '@/lib/dataProcessor';
import * as view from '@/lib/view';
import {emergencyShutdown, shutdown, viewConsole} from '@/lib/view';
import {resolveOptions} from '@/lib/options';


const {version} = require('../../package.json');

program
    .version(version)
    .usage('<site 1> <site 2> ...')
    .description('Compare websites speed!')
    .option('-i, --iterations <n>', 'stop after n iterations; defaults to 300', parseInt)
    .option('-P, --parallel <n>', 'run checks in n workers; defaults to 1', parseInt)
    .option('-m, --mobile', 'chrome mobile UA, iphone 6-like screen, touch events, etc.')
    .option('-k, --insecure', 'ignore HTTPS errors')
    .option('-t, --timeout <n>', 'timeout in seconds for each check; defaults to 20s', parseInt)
    .option('-c  --config [configfile.js]', 'path to config; default is `porchmark.conf.js` in current dir')
    .parse(process.argv);

if (program.args.length === 0) {
    program.outputHelp();
    process.exit(1);
}

export type Argv = {
    iterations?: number,
    parallel?: number,
    mobile?: boolean,
    insecure?: boolean,
    timeout?: number,
    config?: string,
}

const sites = program.args;

const options = resolveOptions(program as Argv);

const dataProcessor = new DataProcessor(sites, options);

setInterval(() => {
    view.renderTable(dataProcessor.calculateResults());
}, 200);

startWorking(sites, dataProcessor, options).catch(emergencyShutdown);

process.on('unhandledRejection', e => viewConsole.error(e));
process.on('SIGINT', () => shutdown(false));
process.on('SIGTERM', () => shutdown(false));
