import path from 'path';
import program, {Command} from 'commander';
import {ChartReport} from './chartReport';

process.on('uncaughtException', (error) => {
    console.error('UncaughtException:');
    console.error(error);
});


program
    .description('Pretty chart reports for porchmark')
    .requiredOption('-c  --config [configfile.js(on)?]', 'path to config')
    .requiredOption('-r --report [report.js(on)?]', 'path to report. Note: porchamrk do not expose `allMetrics` field in its jsonReport. Consider using of this package as a plugin')
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
