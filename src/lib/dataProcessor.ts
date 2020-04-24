import {IComparison, IConfig, IConfigMetricsAggregation} from '@/lib/config';
import {roundToNDigits} from '@/lib/helpers';
import {calculatingStats} from '@/lib/stats';
import {ISite} from '@/types';
import colors from 'colors/safe';
import jstat from 'jstat';

import {getLogger} from '@/lib/logger';

const logger = getLogger();

type Sites = string[];
type RawMetrics = (number)[][][];
type Stats = Array<number|null>[][];
type Diffs = Array<number|null>[][];
type Highlights = Array<-1|0|1|null>[][];
type PaintedMetrics = Array<string|null>[][];
type PaintedDiffs = Array<string|null>[][];
type Iterations = number[];
type ActiveTests = number[];
type StatArrays = Array<number|null>[][];

export interface IMetric {
    name: string;
    title?: string;
}

export interface IMetrics {
    [index: string]: number[];
}

export interface IHumanReport {
    headers: string[];
    data: (string)[][];
    rawData: (number | string)[][];
}

export interface IJsonReportData {
    metrics: {
        [index: string]: {  // key=metric, {DCL: {"q80": {"test1": 99, "test2": 100, "test3": 200}}
            [index: string]: { // key=aggregation
                [index: string]: number; // key=site name, value = metric value
            };
        };
    };
    diffs: {
        [index: string]: { // key=metric, example {DCL: {"q80": {"test2": -12, "test3": 10}}
            [index: string]: { // key=aggregation
                [index: string]: number; // key=site name, value: diff with first site metric
            },
        },
    };
}

export interface IJsonReport {
    sites: ISite[];
    metrics: IMetric[];
    metricAggregations: IConfigMetricsAggregation[];
    data: IJsonReportData;
}

export class DataProcessor {
    public sites: Sites;
    public comparision: IComparison;
    public config: IConfig;

    public rawMetrics: RawMetrics;
    public stats: Stats;
    public diffs: Diffs;
    public highlights: Highlights;
    public paintedMetrics: PaintedMetrics;
    public paintedDiffs: PaintedDiffs;
    public iterations: Iterations;
    public activeTests: ActiveTests;
    public calculationCache: {
        statArrays: StatArrays,
    };
    protected _metrics: {
        [index: string]: IMetrics, // [index: SiteName]
    };

    constructor(config: IConfig, comparision: IComparison) {
        this.sites = comparision.sites.map((site) => site.url);
        this.comparision = comparision;
        this.config = config;
        this._metrics = {};

        // These are growing with each sample
        // this.rawMetrics[siteIndex][metricIndex] is array of all metric samples
        // it's length will grow up to maxIterations
        this.rawMetrics = [];

        // These are recalculated with each sample
        // this.stats[siteIndex][metricIndex][statIndex] stores value for each stat calculated
        this.stats = [];

        // Diffs from reference site (the first supplied). Recalculated with each sample
        // this.diffs[siteIndex][metricIndex][statIndex]
        this.diffs = [];

        // Highlits for each stat -1 will paint it red, 0: gray, 1: green
        // this.highlights[siteIndex][metricIndex][statIndex]
        this.highlights = [];

        // Metric strings after transformation and coloring. These will be shown in terminal
        // this.paintedMetrics[siteIndex][metricIndex][statIndex]
        this.paintedMetrics = [];

        // Diff strings after transformation and coloring. These will be shown in terminal
        // this.paintedDiffs[siteIndex][metricIndex][statIndex]
        this.paintedDiffs = [];

        // this.iterations[siteIndex] stores count of successful iterations for each site
        this.iterations = [];

        // this.activeTests[siteIndex] stores count of currently running tests for each site
        this.activeTests = [];

        for (let siteIndex = 0; siteIndex < this.sites.length; siteIndex++) {
            this.rawMetrics[siteIndex] = [];
            this.stats[siteIndex] = [];
            this.diffs[siteIndex] = [];
            this.highlights[siteIndex] = [];
            this.paintedMetrics[siteIndex] = [];
            this.paintedDiffs[siteIndex] = [];
            this.iterations[siteIndex] = 0;
            this.activeTests[siteIndex] = 0;

            for (let metricIndex = 0; metricIndex < this.config.metrics.length; metricIndex++) {
                this.rawMetrics[siteIndex][metricIndex] = [];
                this.stats[siteIndex][metricIndex] = [];
                this.diffs[siteIndex][metricIndex] = [];
                this.highlights[siteIndex][metricIndex] = [];
                this.paintedMetrics[siteIndex][metricIndex] = [];
                this.paintedDiffs[siteIndex][metricIndex] = [];
            }
        }

        this.calculationCache = {statArrays: []};
    }

    // Takes metrics for site
    public registerMetrics(siteIndex: number, metricValues: number[]): void {
        const site = this.comparision.sites[siteIndex];

        logger.trace(`dataProcessor.registerMetrics ${siteIndex} ${metricValues}`);

        for (const [metricIndex, metricValue] of metricValues.entries()) {
            logger.trace(`dataProcessor.registerMetrics: ${metricIndex} ${metricValue}`);
            this.rawMetrics[siteIndex][metricIndex].push(metricValue);

            const {name: metricName} = this.config.metrics[metricIndex];

            logger.trace(`dataProcessor.registerMetrics: ${site.name} ${metricName}, ${metricValue}`);

            const metric = this._getSiteMetric(site.name, metricName);
            metric.push(metricValue);
        }

        this.iterations[siteIndex]++;
    }

    // Takes metrics for site
    public reportTestStart(siteIndex: number, job: Promise<void>): void {
        this.activeTests[siteIndex]++;

        const jobCallback = () => this.activeTests[siteIndex]--;

        job.then(jobCallback, jobCallback);
    }

    // Does ALL calculations, returns ALL data
    public calculateResults(): {
        sites: Sites,
        stats: Stats,
        diffs: Diffs,
        highlights: Highlights,
        paintedMetrics: PaintedMetrics,
        paintedDiffs: PaintedDiffs,
        iterations: Iterations,
        activeTests: ActiveTests,
    } {

        this.resetCache();

        this.calculateStats();
        this.calculateDiffs();
        this.calculateHighlits();
        this.calculatePaintedMetrics();
        this.calculatePaintedDiffs();

        return {
            sites: this.sites,
            stats: this.stats,
            diffs: this.diffs,
            highlights: this.highlights,
            paintedMetrics: this.paintedMetrics,
            paintedDiffs: this.paintedDiffs,
            iterations: this.iterations,
            activeTests: this.activeTests,
        };
    }

    public calculateStats() {
        // Calculating stats using only minIterations metric slice: every site gets equal chances
        const minIterations = Math.min(...this.iterations);

        for (let siteIndex = 0; siteIndex < this.sites.length; siteIndex++) {
            for (let metricIndex = 0; metricIndex < this.config.metrics.length; metricIndex++) {
                const values = this.rawMetrics[siteIndex][metricIndex].slice(0, minIterations);
                const referenceValues = this.rawMetrics[0][metricIndex].slice(0, minIterations);

                for (let statIndex = 0; statIndex < calculatingStats.length; statIndex++) {
                    let res;
                    if (values.length === 0) {
                        res = null;
                    } else if (siteIndex === 0 && !calculatingStats[statIndex].applicableToReference) {
                        res = null;
                    } else {
                        const stat = calculatingStats[statIndex];
                        res = roundToNDigits(stat.calc(values, referenceValues), stat.roundDigits);
                    }

                    this.stats[siteIndex][metricIndex][statIndex] = res;
                }
            }
        }
    }

    public calculateDiffs() {
        for (let siteIndex = 0; siteIndex < this.sites.length; siteIndex++) {
            for (let metricIndex = 0; metricIndex < this.config.metrics.length; metricIndex++) {
                for (let statIndex = 0; statIndex < calculatingStats.length; statIndex++) {
                    let res;

                    const value = this.stats[siteIndex][metricIndex][statIndex];
                    const referenceValue = this.stats[0][metricIndex][statIndex];
                    const stat = calculatingStats[statIndex];

                    if (value === null || referenceValue === null) {
                        res = null;
                    } else if (!stat.diffAplicable) {
                        res = null;
                    } else if (siteIndex === 0 && !stat.applicableToReference) {
                        res = null;
                    } else {
                        res = roundToNDigits(value - referenceValue, stat.roundDigits);
                    }

                    this.diffs[siteIndex][metricIndex][statIndex] = res;
                }
            }
        }
    }

    public calculateHighlits() {
        for (let metricIndex = 0; metricIndex < this.config.metrics.length; metricIndex++) {
            for (let statIndex = 0; statIndex < calculatingStats.length; statIndex++) {
                const statArray = this.getStatArray(statIndex, metricIndex);

                let paintArray = null;
                const stat = calculatingStats[statIndex];
                paintArray = stat.paint(statArray);

                for (let siteIndex = 0; siteIndex < this.sites.length; siteIndex++) {
                    this.highlights[siteIndex][metricIndex][statIndex] =
                        paintArray === null ? 0 : paintArray[siteIndex];
                }
            }
        }
    }

    public calculatePaintedMetrics() {
        for (let siteIndex = 0; siteIndex < this.sites.length; siteIndex++) {
            for (let metricIndex = 0; metricIndex < this.config.metrics.length; metricIndex++) {
                for (let statIndex = 0; statIndex < calculatingStats.length; statIndex++) {
                    const itemPaint = this.highlights[siteIndex][metricIndex][statIndex];
                    const itemValue = this.stats[siteIndex][metricIndex][statIndex];

                    let res;

                    if (itemValue === null) {
                        res = '';
                    } else if (itemPaint === 1) {
                        res = colors.green(itemValue.toString());
                    } else if (itemPaint === -1) {
                        res = colors.red(itemValue.toString());
                    } else {
                        res = itemValue.toString();
                    }

                    this.paintedMetrics[siteIndex][metricIndex][statIndex] = res;
                }
            }
        }
    }

    public calculatePaintedDiffs() {
        for (let siteIndex = 0; siteIndex < this.sites.length; siteIndex++) {
            for (let metricIndex = 0; metricIndex < this.config.metrics.length; metricIndex++) {
                for (let statIndex = 0; statIndex < calculatingStats.length; statIndex++) {
                    const diff = this.diffs[siteIndex][metricIndex][statIndex];

                    let res;

                    if (siteIndex === 0 || diff === null) {
                        res = '';
                    } else if (diff < 0) {
                        res = diff.toString();
                    } else {
                        res = '+' + diff;
                    }

                    this.paintedDiffs[siteIndex][metricIndex][statIndex] = res;
                }
            }
        }
    }

    public getStatArray(statIndex: number, metricIndex: number): Array<number|null> {
        if (this.calculationCache.statArrays[statIndex][metricIndex]) {
            return this.calculationCache.statArrays[statIndex][metricIndex];
        }

        const statArray: Array<number|null> = [];

        for (let siteIndex = 0; siteIndex < this.sites.length; siteIndex++) {
            statArray[siteIndex] = this.stats[siteIndex][metricIndex][statIndex];
        }

        this.calculationCache.statArrays[statIndex][metricIndex] = statArray;

        return statArray;
    }

    public resetCache() {
        this.calculationCache.statArrays = [];
        for (let statIndex = 0; statIndex < calculatingStats.length; statIndex++) {
            this.calculationCache.statArrays[statIndex] = [];
        }
    }

    // returns iteration count of least successful site
    public getLeastIterations(): number {
        return Math.min(...this.iterations);
    }

    public async calcReports(sites: ISite[]) {
        const siteNames = sites.map((site) => site.name);
        const headers = [
            'metric',
            'func',
            ...siteNames,
            // diff headers (diff0-${siteIndex}): diff0-1, diff0-2
            ...siteNames.filter((_, index) => index > 0).map((_, index) => `diff0-${index + 1}`),
            'p-value',
        ];

        const humanReport: IHumanReport = {
            headers,
            data: [],
            rawData: [],
        };

        const jsonReportData: IJsonReportData = {
            metrics: {},
            diffs: {},
        };

        for (const metric of this.config.metrics) {
            const metricName = metric.name;
            const metricTitle = metric.title ? metric.title : metric.name;

            jsonReportData.metrics[metricName] = {};
            jsonReportData.diffs[metricName] = {};

            for (const aggregation of this.config.metricAggregations) {
                const rawRow: (number | string)[] = [metricTitle, aggregation.name];
                const row: string[] = [metricTitle, aggregation.name];

                if (aggregation.includeMetrics && !aggregation.includeMetrics.includes(metricName)) {
                    logger.trace(`includeMetrics: skip aggregation=${aggregation.name} for metric=${metricName}`);
                    continue;
                }

                if (aggregation.excludeMetrics && aggregation.excludeMetrics.includes(metricName)) {
                    logger.trace(`excludeMetrics: skip aggregation=${aggregation.name} for metric=${metricName}`);
                    continue;
                }

                jsonReportData.metrics[metricName][aggregation.name] = {};
                jsonReportData.diffs[metricName][aggregation.name] = {};

                const allSitesMetrics = [];

                const values: number[] = [];

                for (const siteName of siteNames) {
                    const metricValues = this._getSiteMetric(siteName, metricName);
                    allSitesMetrics.push(metricValues);

                    logger.trace(`metricValues: ${metricName}, ${metricValues}`);

                    const aggregated = this._calcAggregation(aggregation, metricName, metricValues);
                    jsonReportData.metrics[metricName][aggregation.name][siteName] = aggregated;
                    rawRow.push(aggregated);

                    const fixedNumber = this._toFixedNumber(aggregated);
                    row.push(fixedNumber);

                    values.push(aggregated);
                }

                // add diff
                values.forEach((value, index) => {
                    if (index === 0) {
                        return;
                    }

                    const diff = value - values[0];

                    jsonReportData.diffs[metricName][aggregation.name][sites[index].name] = diff;

                    row.push(`${this._getSign(diff)}${this._toFixedNumber(diff)}`);
                });

                // calc p-value
                const pval = jstat.anovaftest(...allSitesMetrics);
                rawRow.push(pval);
                row.push(this._toFixedNumber(pval));

                humanReport.rawData.push(rawRow);
                humanReport.data.push(row);
            }
        }

        const jsonReport: IJsonReport = {
            sites,
            metrics: this.config.metrics,
            metricAggregations: this.config.metricAggregations,
            data: jsonReportData,
        };

        return {humanReport, jsonReport};
    }

    protected _toFixedNumber(i: number): string {
        return typeof i === 'number' ? i.toFixed(2) : '-';
    }

    protected _getSign(i: number): string {
        return i > 0 ? '+' : '';
    }

    protected _getSiteMetric(siteName: string, metricName: string): number[] {
        if (!this._metrics[siteName]) {
            this._metrics[siteName] = {};
        }

        if (!this._metrics[siteName][metricName]) {
            this._metrics[siteName][metricName] = [];
        }

        return this._metrics[siteName][metricName];
    }

    protected _calcAggregation(aggregation: IConfigMetricsAggregation, metricName: string, metrics: number[]): number {
        logger.debug(`metric=${metricName}: calc aggregation=${aggregation}`);

        switch (aggregation.name) {
            case 'q50':
                return jstat.percentile(metrics, 0.5);
            case 'q80':
                return jstat.percentile(metrics, 0.8);
            case 'q95':
                return jstat.percentile(metrics, 0.95);
            case 'stdev':
                return jstat.stdev(metrics, true);
            case 'count':
                return metrics.length;
            default:
                throw new Error(`unknown aggregation ${aggregation}`);
        }
    }
}
