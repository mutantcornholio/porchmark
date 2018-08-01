'use strict';

const ss = require('simple-statistics');

const watchingMetrics = [
    'connected',
    'SSL done',
    'requestStart',
    'TTFB',
    'TTLB',
    'FCP',
    'DCL',
    'loaded',
];
const watchingMetricsRealNames = [
    'connectEnd',
    'secureConnectionStart',
    'requestStart',
    'responseStart',
    'responseEnd',
    'first-contentful-paint',
    'domContentLoadedEventEnd',
    'loadEventEnd',
];
exports.watchingMetrics = watchingMetrics;
const calculatingStats = [
    { name: 'q50', calc: values => ss.quantile(values, 0.5)},
    { name: 'q80', calc: values =>  ss.quantile(values, 0.8)},
    { name: 'q95', calc: values => ss.quantile(values, 0.95)},
    { name: 'mean', calc: values => ss.mean(values)},
    { name: 'sd', calc: values => ss.standardDeviation(values)},
];

const calculatingStatTypes = calculatingStats.map(stat => stat.name);
exports.calculatingStatTypes = calculatingStatTypes;

const browser = require('./browser');
const view = require('./view');

async function race(sites, options = {}) {
    const metrics = Array(sites.length).fill(null).map(() => ({}));
    for (const metr of watchingMetrics) {
        for (const site of metrics) {
            site[metr] = [];
        }
    }

    const iterations = Array(sites.length).fill(0);

    let workersDone = 0;

    const runWorker = () => conditionallyPutToWork(sites, iterations, options)
        .then(registerMetrics, error => {
            view.console.log(error);
            return runWorker();
        });

    const registerMetrics = ([newMetrics, currentSite, done]) => {
        if (done) {
            workersDone++;

            if (workersDone === options.workers) {
                return view.shutdown();
            }

            return;
        }

        for (let metricIndex = 0; metricIndex < watchingMetrics.length; metricIndex++) {
            metrics[currentSite][watchingMetrics[metricIndex]].push(newMetrics[watchingMetricsRealNames[metricIndex]]);
        }

        iterations[currentSite]++;

        if (!iterations.some(i => i === 0)) {
            view.renderTable(prepareTable(sites, metrics, iterations));
        }

        runWorker();
    };

    for (let i = 0; i < options.workers; i++) {
        runWorker();
    }
}
exports.race = race;

let currentSite = 0;
async function conditionallyPutToWork(sites, iterations, options) {
    let doneSites = 0;
    do {
        currentSite = (currentSite + 1) % sites.length;
        doneSites++;
        if (doneSites === sites.length) {
            return [null, null, true];
        }
    } while (iterations[currentSite] >= options.maxIterations);

    const metrics = await browser.runCheck(sites[currentSite], options);

    return [metrics, currentSite];
}

function prepareTable(sites, metrics, iterations) {
    const table = [];
    for (const [index, site] of sites.entries()) {
        const resMetrics = watchingMetrics.map(metr => {
            const values = metrics[index][metr];

            if (values === undefined) { // first scan
                view.console.log('zalupa');
                return;
            }

            return calculatingStats.map(stat => Math.round(stat.calc(values) * 10) / 10);
        });


        const diffs = resMetrics.map((metr, metrIndex) => {
            if (index === 0) {
                return new Array(calculatingStatTypes.length).fill(0);
            }

            return metr.map((stat, statIndex) => {
                return Math.round((stat - table[0].metrics[metrIndex][statIndex]) * 10) / 10}
            );
        });

        table.push({
            site,
            iterations: iterations[index],
            metrics: resMetrics,
            diffs: diffs,
        });
    }

    return table;
}
