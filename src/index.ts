import fs from 'fs';
import path from 'path';
import program, {Command} from 'commander';
import {ChartReport} from './chartReport';

import configMock from './__spec__/config.mock';
import rawReportMock from './__spec__/jsonRawReport.mock';

process.on('uncaughtException', (error) => {
    console.error('UncaughtException:');
    console.error(error);
});


program
    .description('realtime compare websites')
    .requiredOption('-c  --config [configfile.js(on)?]', 'path to config')
    .requiredOption('-r --report [report.js(on)?]', 'path to report')
    .option('-v --verbose', 'verbose')
    .action(function (cmd: Command) {
        const isVerbose = cmd.verbose;

        isVerbose && console.info('Read config...');
        const config = require(path.resolve(process.cwd(), cmd.config));

        isVerbose && console.info('Read report...');
        const report = require(path.resolve(process.cwd(), cmd.report));
        
        isVerbose && console.info('Prepare reporter...');
        const reporter = new ChartReport();

        isVerbose && console.info('Build report...');
        reporter.prepareData(config, report);
        
        isVerbose && console.info('Save report...');
        reporter.saveToFs('.', 'report');
        
        isVerbose && console.info('Done.');
    })
    .parse(process.argv);
