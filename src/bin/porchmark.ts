#!/usr/bin/env node
import 'source-map-support/register';

import program from 'commander';

import {shutdown, viewConsole} from '@/lib/view';

import {createLogger, setLogger} from '@/lib/logger';

const logger = createLogger();
setLogger(logger);

// if import, tsc ignores rootDir and transpile package.json and src to dist
// tslint:disable-next-line no-var-requires
const pkg = require('@/../package.json');

const version = pkg.version;

process.on('unhandledRejection', (e) => {
    logger.error(e);
    viewConsole.error(e);
});
process.on('SIGINT', () => shutdown(false));
process.on('SIGTERM', () => shutdown(false));

program
    .version(version)
    .description('Compare websites speed!')
    .command('compare <sites...>', 'realtime compare websites')
    .parse(process.argv);
