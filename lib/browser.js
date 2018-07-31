'use strict';
const puppeteer = require('puppeteer');

let bro;
let page;

async function runCheck(site, timeout) {
    if (!bro) {
        bro = await puppeteer.launch({headless: true});
    }

    const page = await bro.newPage();
    await page.setViewport({width: 1344, height: 768});

    await page.goto(site, {waitUntil: 'networkidle0'});

    const metrics = await getMetrics(page);
    await page.close();
    return metrics;
}

async function getMetrics(page) {
    return page.evaluate(() => performance.getEntriesByType('navigation')[0].toJSON());
}

module.exports = {
    runCheck,
};
