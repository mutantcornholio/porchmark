#!/usr/bin/env node
import 'source-map-support/register';

import path from 'path';
import program, {Command} from 'commander';

import {createLogger} from "@/lib/logger";

import startWorking from '@/lib/workerFarm';
import {DataProcessor} from '@/lib/dataProcessor';
import * as view from '@/lib/view';
import {emergencyShutdown, shutdown, viewConsole} from '@/lib/view';
import {resolveOptions} from '@/lib/options';
import {CommandApi} from "@/classes/CommandApi";
import {IRawCompareReleasesConfig} from "@/types";

const logger = createLogger();

const {version} = require('../../package.json');

export type CompareMetricsArgv = {
    iterations?: number,
    parallel?: number,
    mobile?: boolean,
    insecure?: boolean,
    timeout?: number,
    config?: string,
}

let currentCommand: string = '';

const setCurrentCommand = (cmd: Command) => {
    currentCommand = cmd.name();
};

program
    .version(version)
    .description('Compare websites speed!');

// compare-realtime
program.command('compare-realtime  <sites...>')
    .description('realtime compare websites')
    .option('-i, --iterations <n>', 'stop after n iterations; defaults to 300', parseInt)
    .option('-P, --parallel <n>', 'run checks in n workers; defaults to 1', parseInt)
    .option('-m, --mobile', 'chrome mobile UA, iphone 6-like screen, touch events, etc.')
    .option('-k, --insecure', 'ignore HTTPS errors')
    .option('-t, --timeout <n>', 'timeout in seconds for each check; defaults to 20s', parseInt)
    .option('-c  --config [configfile.js]', 'path to config; default is `porchmark.conf.js` in current dir')
    .action(function (this: Command, sites: string[], cmd: Command) {
        setCurrentCommand(this);

        const options = resolveOptions(cmd as CompareMetricsArgv);

        const dataProcessor = new DataProcessor(sites, options);

        setInterval(() => {
            view.renderTable(dataProcessor.calculateResults());
        }, 200);

        startWorking(sites, dataProcessor, options).catch(emergencyShutdown);
    });

// compare-releases
program.command('compare-releases')
    .description('compare releases with Web Page Replay')
    .option('-c  --config [configfile.js]', 'path to config')
    .action(async function (this: Command) {
        setCurrentCommand(this);

        if (!this.config) {
            logger.fatal('set path to compare config, use --config option');
            process.exit(1);
        }

        const rawConfigFilepath = this.config;

        const configFilepath = path.isAbsolute(rawConfigFilepath) ? rawConfigFilepath : path.resolve(rawConfigFilepath);

        // TODO check file exists and require errors
        let config: IRawCompareReleasesConfig = require(configFilepath);

        const api = new CommandApi(logger);

        try {
            await api.compareReleasesCyclic(config.workDir, config);
        } catch (error) {
            if (error.isJoi) {
                logger.fatal(`invalid config\n${JSON.stringify(config, null, 2)}`);
                error.details.forEach((e: any) => {
                    logger.fatal(`path=${e.path.join('.')}, ${e.message}`)
                });
            } else {
                logger.error(error);
            }
        }
    });

program.parse(process.argv);

if (!currentCommand.length) {
    logger.fatal("no command specified");
    program.outputHelp();
    process.exit(1);
}

process.on('unhandledRejection', e => viewConsole.error(e));
process.on('SIGINT', () => shutdown(false));
process.on('SIGTERM', () => shutdown(false));
