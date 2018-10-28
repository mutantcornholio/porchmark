#!/usr/bin/env node
import program from 'commander';

import startWorking from '../lib/workerFarm';
import {DataProcessor} from '@/lib/dataProcessor';
import {shutdown, console as viewConsole, emergencyShutdown} from '@/lib/view';
import * as view from '@/lib/view';

const {version} = require('../../package.json');

program
    .version(version)
    .usage('<site 1> <site 2> ...')
    .description('Compare websites speed!')
    .option('-i, --iterations <n>', 'stop after n iterations; defaults to 300', parseInt)
    .option('-P, --parallel <n>', 'run checks in n workers; defaults to 1', parseInt)
    .option('-m, --mobile', 'chrome mobile UA, iphone 6-like screen, touch events, etc.')
    .option('-k, --insecure', 'ignore HTTPS errors')
    .parse(process.argv);

if (program.args.length === 0) {
    program.outputHelp();
    process.exit(1);
}

// splashScreen();
// init();

const sites = program.args;
const options = {
    maxIterations: program.iterations || 300,
    workers: program.parallel || 1,
    mobile: program.mobile || false,
    insecure: program.insecure || false,
};

const dataProcessor = new DataProcessor(sites, options);

setInterval(() => {
    // if (dataProcessor.getLeastIterations() > 0) {
        view.renderTable(dataProcessor.calculateResults());
    // }
}, 200);

startWorking(sites, dataProcessor, options).catch(emergencyShutdown);

process.on('unhandledRejection', e => viewConsole.error(e));
process.on('SIGINT', () => shutdown(false));
process.on('SIGTERM', () => shutdown(false));

export type Options = {
    maxIterations: number,
    workers: number,
    mobile: boolean,
    insecure: boolean,
}
