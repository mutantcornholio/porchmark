
const blessed = require('blessed');
const Table = require('cli-table');
const ss = require('simple-statistics');
const colors = require('colors/safe');


const {watchingMetrics} = require('./raceMaster');

let screen;
let table;
let box;
let splashBox;

const metrCount = watchingMetrics.length;
const metrColumnWidth = Math.floor((process.stdout.columns - 35 - metrCount) / metrCount);

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
    splashBox.setContent('LOADING');
    screen.render();
}

function renderTable(tableData) {
    init();

    table = new Table({
        head: ['', '', ...watchingMetrics],
        colAligns: ['left', 'right', ...Array(metrCount).fill('right')],
        colWidths: [25, 8, ...Array(metrCount).fill(metrColumnWidth)]
    });

    let meanResults, q80Results, q95Results;

    for (let metricIndex = 0; metricIndex < watchingMetrics.length; metricIndex++) {
        meanResults = paintChecks(tableData.map(site => site.metrics[metricIndex].mean));
        q80Results = paintChecks(tableData.map(site => site.metrics[metricIndex].q80));
        q95Results = paintChecks(tableData.map(site => site.metrics[metricIndex].q95));

        for (let paintedIndex = 0; paintedIndex < tableData.length; paintedIndex++) {
            tableData[paintedIndex].metrics[metricIndex].mean = meanResults[paintedIndex];
            tableData[paintedIndex].metrics[metricIndex].q80 = q80Results[paintedIndex];
            tableData[paintedIndex].metrics[metricIndex].q95 = q95Results[paintedIndex];
        }
    }

    for (let siteIndex = 0; siteIndex < tableData.length; siteIndex++) {
        const site = tableData[siteIndex];
        const header = `${site.site}\niterations: ${site.iterations}`;
        table.push({
            [header]: [
                'mean\nsd\nq80\nq95\n',
                ...site.metrics.map(metr => {

                    return [
                        metr.mean,
                        metr.sd,
                        metr.q80,
                        metr.q95,
                    ].join('\n');
                })
            ]
        })
    }

    box.setContent(table.toString());
    screen.render();
}

function shutdown() {

}

module.exports = {
    renderTable,
    splashScreen,
};

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
