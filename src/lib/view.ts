import colors from 'colors/safe';
import Table, {Cell} from 'cli-table2';
import blessed, {Widgets} from 'blessed';
import {Console} from 'console';
import {Writable} from 'stream';

import {calculatingStats} from '@/lib/stats';
import {stdoutRect} from '@/lib/helpers';
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
export const viewConsole = new Console(logStream, logStream);

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

export function getTableText() {
    return tableText ? tableText : "";
}

export function softShutdown() {
    screen.destroy();
    if (tableText) {
        console.log(tableText);
    }

    if (logs.length > 0) {
        console.error(`\nLast logs:\n${logs.join('\n')}`);
    }
}

export function shutdown(errorHappened: boolean) {
    softShutdown();
    process.exit(errorHappened ? 1 : 0);
}

export function emergencyShutdown(error: Error) {
    viewConsole.log(error);
    shutdown(true);
}

let paddedSitenames: string[];
let maxLength: number;
let spaceInsufficiency: number;

function trimSitenames(sites: string[]): string[] {
    if (!paddedSitenames) {
        maxLength = Math.max(...sites.map(site => site.length));

        paddedSitenames = sites.map(site => {
            const pad = Math.ceil((maxLength - site.length) / 2);

            return site.padEnd(pad).padStart(pad);
        });

        spaceInsufficiency = maxLength - maxSitenameWidth;
    }

    const shifter = (Date.now()/200) % (spaceInsufficiency * 2.5) - spaceInsufficiency * 0.25;
    let position: number;
    if (shifter < 0) {
        position = 0
    } else if (shifter < spaceInsufficiency) {
        position = shifter;
    } else if (shifter < spaceInsufficiency * 1.25) {
        position = spaceInsufficiency;
    } else if (shifter < spaceInsufficiency * 2) {
        position = 2 * spaceInsufficiency - shifter;
    } else if (shifter < spaceInsufficiency * 2) {
        position = 0;
    }

    return paddedSitenames.map(site => colors.green(site.slice(position)));
}

