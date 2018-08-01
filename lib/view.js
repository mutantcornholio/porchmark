const { Writable } = require('stream');
const { Console } = require('console');
const blessed = require('blessed');
const Table = require('cli-table2');
const ss = require('simple-statistics');
const colors = require('colors/safe');

const {watchingMetrics, calculatingStatTypes} = require('./raceMaster');

let screen;
let box;
let splashBox;

let tableText = '';
let logs = [];

const splitByColsRegex = new RegExp('.{1,' + process.stdout.columns + '}', 'g');
class ConsoleStream extends Writable {
    _write(chunk, _, callback) {
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
const logConsole = new Console(logStream, logStream);
exports.console = logConsole;

const metrCount = watchingMetrics.length * 2;

// -8 for stat names
// metrCount + 2 is sitename column (which is double)
const metrColumnWidth = Math.floor((process.stdout.columns - 8 - (metrCount + 2)) / (metrCount + 2));
const splitByMetrColumnWidthRegex = new RegExp('.{1,' + (metrColumnWidth * 2 - 2) + '}', 'g');

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

function splashScreen() {
    init();
    splashBox = blessed.box({
        height: 10,
        width: 20,
        top: process.stdout.rows / 2,
        left: (process.stdout.columns / 2) - 10 ,

    });
    screen.append(splashBox);
    splashBox.setContent(' LOADING');
    setTimeout(() => {
        if (splashBox) {
            splashBox.setContent(' LOADING\n\nSERIOUSLY');
            screen.render();
        }
    }, 5000);
    screen.render();
}
exports.splashScreen = splashScreen;

function renderTable(tableData) {
    const table = new Table({
        head: ['', '', ...watchingMetrics.map(metr => ({content: metr, colSpan:2}))],
        colAligns: ['left', 'right', ...Array(metrCount).fill('right')],
        colWidths: [
            metrColumnWidth * 2,
            8,
            ...Array(metrCount).fill(metrColumnWidth),
        ],
    });

    for (let metricIndex = 0; metricIndex < watchingMetrics.length; metricIndex++) {
        for (let statIndex = 0; statIndex < calculatingStatTypes.length; statIndex++) {
            const paintedResults = paintChecks(tableData.map(site => site.metrics[metricIndex][statIndex]));

            for (let siteIndex = 0; siteIndex < tableData.length; siteIndex++) {
                tableData[siteIndex].metrics[metricIndex][statIndex] = paintedResults[siteIndex];
            }
        }
    }

    for (let siteIndex = 0; siteIndex < tableData.length; siteIndex++) {
        const site = tableData[siteIndex];
        const trimmedSitename = site.site
            .match(splitByMetrColumnWidthRegex)
            .slice(0, calculatingStatTypes.length - 1)
            .join('\n');
        const header = `${colors.red(trimmedSitename)}\niterations: ${site.iterations}`;

        const resultRow = [header, calculatingStatTypes.join('\n')];

        for (let metricIndex = 0; metricIndex < watchingMetrics.length; metricIndex++) {
            const metr = site.metrics[metricIndex];
            const diffs = site.diffs[metricIndex].map(diff => diff < 0 ? '' + diff : '+' + diff);

            resultRow.push(metr.join('\n'), diffs.join('\n'));
        }

        table.push(resultRow);
    }

    tableText = table.toString();
    render();
}
exports.renderTable = renderTable;

function render() {
    init();

    const tableLines = tableText.split('\n');

    const tableHeight = (tableLines.length);
    const maxLogs = process.stdout.rows - tableHeight - 1;

    if (logs.length > maxLogs) {
        logs.splice(0, logs.length - maxLogs);
    }

    box.setContent([...tableLines, ...logs].join('\n'));
    screen.render();
}

function shutdown(errorHappened) {
    screen.destroy();
    if (tableText) {
        console.log(tableText);
    }

    if (logs.length > 0) {
        console.error(`\nLast logs:\n${logs.join('\n')}`);
    }

    process.exit(errorHappened === true ? 1 : 0);
}
exports.shutdown = shutdown;

function emergencyShutdown(error) {
    logConsole.log(error);
    shutdown(true);
}
exports.emergencyShutdown = emergencyShutdown;

function paintChecks(arr) {
    const mean = ss.mean(arr);

    return arr.map(item => {
        if (item < mean * 0.8) {
            return colors.green(item)
        } else  if (item > mean * 1.2) {
            return colors.red(item)
        }

        return item;
    })
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
