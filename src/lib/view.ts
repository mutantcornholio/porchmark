import {calculatingStats} from './stats';

import {stdoutRect} from './helpers';
import colors from 'colors/safe';
import Table, {Cell} from 'cli-table2';
import blessed, {Widgets} from 'blessed';
import {Console} from 'console';
import {Writable} from 'stream';
import {watchingMetrics} from '@/types';

let screen: Widgets.Screen;
let box: Widgets.BoxElement;
let splashBox: Widgets.BoxElement;

let tableText = '';
let logs: string[] = [];


const splitByColsRegex = new RegExp('.{1,' + process.stdout.columns + '}', 'g');
class ConsoleStream extends Writable {
    _write(chunk: string | Buffer, _: any, callback: (error?: Error | null) => void): void {
        if (!screen) {
            console.log(chunk.toString());
            callback();
            return;
        }
        const strings = chunk.toString().split('\n');

        for (const str of strings) {
            const splittedStrings = str.match(splitByColsRegex);

            if (splittedStrings === null) {
                logs.push(str);
            } else {
                logs.push(...splittedStrings);
            }
        }

        callback();
        render();
    }
}

const logStream = new ConsoleStream();
const viewConsole = new Console(logStream, logStream);
export {viewConsole as console};

const metrCount = watchingMetrics.length * 2;

const columns = stdoutRect()[1];

// metrCount + 2 is sitename column (which is double)
const statNameWidth = Math.max.apply(null, calculatingStats.map(stat => stat.name.length)) + 2;
const metrColumnWidth = Math.floor((columns - statNameWidth - (metrCount + 2)) / (metrCount + 2));
const maxSitenameWidth = metrColumnWidth * 2 - 2;

function init() {
    if (!screen) {
        screen = blessed.screen({
            smartCSR: true,
        });
        box = blessed.box({});
        screen.append(box);
    }
    if (splashBox) {
        splashBox.destroy();
    }
}

export function renderTable({sites, paintedMetrics, paintedDiffs, iterations, activeTests}: {
    sites: string[],
    paintedMetrics: (string|null)[][][],
    paintedDiffs: (string|null)[][][],
    iterations: number[],
    activeTests: number[],
}) {
    const table = new Table({
        head: ['', '', ...watchingMetrics.map(metr => ({content: metr, colSpan:2}))],
        colAligns: ['left', 'right', ...Array(metrCount).fill('right')],
        colWidths: [
            metrColumnWidth * 2,
            statNameWidth,
            ...Array(metrCount).fill(metrColumnWidth),
        ],
        wordWrap: true,
    }) as Table.HorizontalTable;

    const trimmedSitenames = trimSitenames(sites);

    for (let siteIndex = 0; siteIndex < sites.length; siteIndex++) {
        const header = trimmedSitenames[siteIndex] +
            `\niterations: ${iterations[siteIndex]}` +
            `\nactive tests: ${activeTests[siteIndex]}`;

        const statsToDisplay = siteIndex === 0 ?
            calculatingStats.filter(stat => stat.applicableToReference)
            : calculatingStats
        ;

        const resultRow: Cell[] = [header, statsToDisplay.map(stat => stat.name).join('\n')];

        for (let metricIndex = 0; metricIndex < watchingMetrics.length; metricIndex++) {
            resultRow.push(
                paintedMetrics[siteIndex][metricIndex].join('\n'),
                paintedDiffs[siteIndex][metricIndex].join('\n')
            );
        }

        table.push(resultRow);
    }

    tableText = table.toString();
    render();
}

function render() {
    init();

    const rows = stdoutRect()[0];

    const tableLines = tableText.split('\n');

    const tableHeight = (tableLines.length);
    const maxLogs = rows - tableHeight - 1;

    if (logs.length > maxLogs) {
        logs.splice(0, logs.length - maxLogs);
    }

    box.setContent([...tableLines, ...logs].join('\n'));
    screen.render();
}

export function shutdown(errorHappened: boolean) {
    screen.destroy();
    if (tableText) {
        console.log(tableText);
    }

    if (logs.length > 0) {
        console.error(`\nLast logs:\n${logs.join('\n')}`);
    }

    process.exit(errorHappened ? 1 : 0);
}

export function emergencyShutdown(error: Error) {
    viewConsole.log(error);
    shutdown(true);
}

function trimSitenames(_sites: string[]): string[] {
    const sites = _sites.slice();

    let letterIndex = 0;
    for (; letterIndex < sites[0].length; letterIndex++) {
        let differed = false;
        const currentSymbol = sites[0][letterIndex];
        for (let siteIndex = 1; siteIndex < sites.length; siteIndex++) {
            if (currentSymbol === sites[siteIndex][letterIndex]) {
                continue;
            }

            differed = true;
            break;
        }

        if (differed) {
            break;
        }
    }

    const trimmedSites = [];
    for (let siteIndex = 0; siteIndex < sites.length; siteIndex++) {
        let res;
        // const res = '…' + sites[siteIndex].slice(letterIndex - 4);
        if (sites[siteIndex].length < maxSitenameWidth) {
            res = colors.red(sites[siteIndex]);
        } else if (letterIndex > 8) {
            let startCut = 0;

            if (sites[siteIndex].length - letterIndex < maxSitenameWidth) {
                startCut = sites[siteIndex].length - maxSitenameWidth + 3;
            } else {
                startCut = letterIndex + 3;
            }

            res = colors.grey('…') + colors.red(sites[siteIndex].slice(startCut));
        } else {
            res = colors.red(sites[siteIndex]);
        }
        trimmedSites[siteIndex] = res;
    }

    return trimmedSites;
}

