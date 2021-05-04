import {PORCHMARK_REPORT_VERSION, PORCHMARK_VERSION} from '@/constants';
import { IConfigMetricsAggregation } from '@/lib/config';
import { IMetric, IPrepareDataParams, IReport, ISite } from '@/types';
import * as fs from 'fs-extra';
import * as path from 'path';

interface IJsonReportData {
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

interface IJsonReport {
    version: string;
    reportVersion: number;
    startedAt: string;
    completedAt: string;
    sites: ISite[];
    metrics: IMetric[];
    metricAggregations: IConfigMetricsAggregation[];
    data: IJsonReportData;
}

export class JsonReport implements IReport {
    private startedAt: string;
    private completedAt: string;
    private sites: ISite[];
    private metrics: IMetric[];
    private metricAggregations: IConfigMetricsAggregation[];
    private data: IJsonReportData;

    public constructor() {
        this.startedAt = '';
        this.completedAt = '';
        this.sites = [];
        this.metrics = [];
        this.metricAggregations = [];
        this.data = {
            metrics: {},
            diffs: {},
        };
    }

    /* Obtain and convert JsonReport to internal view */
    public prepareData({startedAt, completedAt, report}: IPrepareDataParams) {
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.sites = report.sites;
        this.metrics = report.metrics;
        this.metricAggregations = report.metricAggregations;
        this.data = {
            diffs: report.data.diffs,
            metrics: report.data.metrics,
        };
    }

    /* Flush internal data to file system */
    public async saveToFs(workDir: string, id: string) {
        await this.saveJsonReport(
            workDir,
            this.exposeInternalView(),
            id,
        );
    }

    /* For testing purposes only */
    public exposeInternalView() {
        return {
            version: PORCHMARK_VERSION,
            reportVersion: PORCHMARK_REPORT_VERSION,
            startedAt: this.startedAt,
            completedAt: this.completedAt,
            sites: this.sites,
            metrics: this.metrics,
            metricAggregations: this.metricAggregations,
            data: this.data,
        };
    }

    private getReportFilepath(workDir: string, id: string) {
        return path.resolve(workDir, `report-${id}.json`);
    }

    private async saveJsonReport(workDir: string, report: IJsonReport, id: string) {
        const filepath = this.getReportFilepath(workDir, id);
        await fs.writeJson(filepath, report);
    }
}
