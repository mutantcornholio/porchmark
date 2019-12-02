#!/usr/bin/env node
import 'source-map-support/register';

import program from 'commander';

import {shutdown, viewConsole} from '@/lib/view';

const {version} = require('../../package.json');

process.on('unhandledRejection', e => viewConsole.error(e));
process.on('SIGINT', () => shutdown(false));
process.on('SIGTERM', () => shutdown(false));

program
    .version(version)
    .description('Compare websites speed!')
    .command('compare <sites...>', 'realtime compare websites')
    .parse(process.argv);
