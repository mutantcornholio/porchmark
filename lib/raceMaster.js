'use strict';

const ss = require('simple-statistics');

const browser = require('./browser');

const watchingMetrics = [
    'connectEnd',
    'secureConnectionStart',
    'requestStart',
    'responseStart',
    'responseEnd',
    'domInteractive',
    'domContentLoadedEventEnd',
    'loadEventEnd',
];

async function race(sites, options = {}) {
    const view = require('./view');

    const metrics = Array(sites.length).fill(null).map(() => ({}));
    const iterations = Array(sites.length).fill(0);

    let workersDone = 0;
    const registerMetrics = ([newMetrics, currentSite, done]) => {
        if (done) {
            workersDone++;

            if (workersDone === options.workers) {
                return view.shutdown();
            }

            return;
        }

        for (const metric of watchingMetrics) {
            if (!metrics[currentSite][metric]) {
                metrics[currentSite][metric] = [];
            }

            metrics[currentSite][metric].push(newMetrics[metric]);
        }

        iterations[currentSite]++;

        if (!iterations.some(i => i === 0)) {
            view.renderTable(prepareTable(sites, metrics, iterations));
        }

        conditionallyPutToWork(sites, iterations, options).then(registerMetrics, error => console.error(error));
    };

    for (let i = 0; i < options.workers; i++) {
        conditionallyPutToWork(sites, iterations, options).then(registerMetrics, error => console.error(error));
    }
}

let currentSite = 0;
async function conditionallyPutToWork(sites, iterations, {maxIterations: maxIterations, timeout}) {
    let doneSites = 0;
    do {
        currentSite = (currentSite + 1) % sites.length;
        doneSites++;
        if (doneSites === sites.length) {
            return [null, null, true];
        }
    } while (iterations[currentSite] >= maxIterations);

    const metrics = await browser.runCheck(sites[currentSite], timeout);

    return [metrics, currentSite];
}


module.exports = {
    race,
    watchingMetrics,
};

function prepareTable(sites, metrics, iterations) {
    const table = [];
    for (const [index, site] of sites.entries()) {
        table.push({
            site,
            iterations: iterations[index],
            metrics: watchingMetrics.map(metr => {
                const values = metrics[index][metr];

                if (values === undefined) { // first scan
                    return;
                }

                return {
                    mean: Math.round(ss.mean(values) * 1000) / 1000,
                    sd: Math.round(ss.standardDeviation(values) * 1000) / 1000,
                    q80: Math.round(ss.quantile(values, 0.8) * 1000) / 1000,
                    q95: Math.round(ss.quantile(values, 0.95) * 1000) / 1000,
                };
            })
        });
    }

    return table;
}
