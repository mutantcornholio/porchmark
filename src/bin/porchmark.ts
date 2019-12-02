#!/usr/bin/env node
import 'source-map-support/register';

import program from 'commander';

import {shutdown, viewConsole} from '@/lib/view';

// @ts-ignore package.json is not under rootDir
import pkg = require('../../package.json');

const version = pkg.version;

process.on('unhandledRejection', (e) => viewConsole.error(e));
process.on('SIGINT', () => shutdown(false));
process.on('SIGTERM', () => shutdown(false));

program
    .version(version)
    .description('Compare websites speed!')
    .command('compare <sites...>', 'realtime compare websites')
    .parse(process.argv);
