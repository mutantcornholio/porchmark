#!/usr/bin/env node
const program = require('commander');
const version = require('../package.json').version;

const raceMaster = require('../lib/raceMaster');
const view = require('../lib/view');

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

view.splashScreen();

raceMaster.race(program.args, {
    maxIterations: program.iterations || 300,
    workers: program.parallel || 1,
    mobile: program.mobile || false,
    insecure: program.insecure || false,
});

process.on('unhandledRejection', view.emergencyShutdown);
