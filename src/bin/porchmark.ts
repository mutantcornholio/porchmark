#!/usr/bin/env node
import 'source-map-support/register';

import program from 'commander';

import {getView} from '@/lib/view';

import {createLogger, setLogger} from '@/lib/logger';

const view = getView();

const logger = createLogger();
setLogger(logger);

// if import, tsc ignores rootDir and transpile package.json and src to dist
// tslint:disable-next-line no-var-requires
const pkg = require('@/../package.json');

const version = pkg.version;

process.on('unhandledRejection', (e) => {
    logger.error(e);
    process.exit(1);
});
process.on('SIGINT', () => view.shutdown(false));
process.on('SIGTERM', () => view.shutdown(false));

program
    .version(version)
    .description('Compare websites speed!')
    .command('compare <sites...>', 'realtime compare websites')
    .parse(process.argv);
