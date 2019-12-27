import {IComparison, IConfig} from '@/lib/config';
import {roundToNDigits} from '@/lib/helpers';
import {calculatingStats} from '@/lib/stats';
import {watchingMetrics} from '@/types';
import colors from 'colors/safe';

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

    constructor(config: IConfig, comparision: IComparison) {
        this.sites = comparision.sites.map((site) => site.url);
        this.comparision = comparision;
        this.config = config;

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

            for (let metricIndex = 0; metricIndex < watchingMetrics.length; metricIndex++) {
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
        for (const [metricIndex, value] of metricValues.entries()) {
            this.rawMetrics[siteIndex][metricIndex].push(value);
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
            for (let metricIndex = 0; metricIndex < watchingMetrics.length; metricIndex++) {
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
            for (let metricIndex = 0; metricIndex < watchingMetrics.length; metricIndex++) {
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
        for (let metricIndex = 0; metricIndex < watchingMetrics.length; metricIndex++) {
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
            for (let metricIndex = 0; metricIndex < watchingMetrics.length; metricIndex++) {
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
            for (let metricIndex = 0; metricIndex < watchingMetrics.length; metricIndex++) {
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
}
