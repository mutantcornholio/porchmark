import { IConfig } from '@/lib/config';
import { IJsonReport } from '@/lib/dataProcessor';
import cTable = require('console.table');
import * as fs from 'fs-extra';
import jstat from 'jstat';
import * as path from 'path';
import { IReport } from './iReport';

export interface IHumanReport {
    headers: string[];
    data: (string)[][];
    rawData: (number | string)[][];
}

export class HumanReport implements IReport {
    public headers: string[];
    public rawData: (string | number)[][];
    public data: (string)[][];

    public constructor() {
        this.headers = [];
        this.rawData = [];
        this.data = [];
    }

    public exposeInternalView(): IHumanReport {
        return {
            data: this.data,
            headers: this.headers,
            rawData: this.rawData,
        };
    }

    public prepareData(config: IConfig, {data, sites}: IJsonReport) {
        const siteNames = sites.map((site) => site.name);
        const diffSiteNames = siteNames.filter((_, index) => index > 0);
        this.headers = [
            'metric',
            'func',
            ...siteNames,
            // diff headers (diff0-${siteIndex}): diff0-1, diff0-2
            ...diffSiteNames.map((_, index) => `diff0-${index + 1}`),
            'p-value',
        ];

        for (const metric of config.metrics) {
            const metricName = metric.name;
            const metricTitle = metric.title ? metric.title : metric.name;

            for (const aggregation of config.metricAggregations) {
                const rawRow: (number | string)[] = [metricTitle, aggregation.name];
                const row: string[] = [metricTitle, aggregation.name];

                if (!data.metrics[metricName][aggregation.name]) {
                    continue;
                }

                for (const siteName of siteNames) {
                    const aggregated = data.metrics[metricName][aggregation.name][siteName];
                    rawRow.push(aggregated);

                    const fixedNumber = this._toFixedNumber(aggregated);
                    row.push(fixedNumber);
                }

                for (const siteName of diffSiteNames) {
                    const diff = data.diffs[metricName][aggregation.name][siteName];
                    rawRow.push(diff);
                    row.push(`${this._getSign(diff)}${this._toFixedNumber(diff)}`);
                }

                const allSitesMetrics = Object.values(data.allMetrics[metricName]);
                const pval = jstat.anovaftest(...allSitesMetrics);
                rawRow.push(pval);
                row.push(this._toFixedNumber(pval));

                this.rawData.push(rawRow);
                this.data.push(row);
            }
        }
    }

    public async saveToFs(workDir: string, id: string) {
        await this.saveHumanReport(workDir, this.exposeInternalView(), id);
    }

    protected _toFixedNumber(i: number): string {
        return typeof i === 'number' ? i.toFixed(2) : '-';
    }

    protected _getSign(i: number): string {
        return i > 0 ? '+' : '';
    }

    protected async saveHumanReport(workDir: string, report: IHumanReport, id: string) {
        const filepath = this.getHumanReportFilepath(workDir, id);
        const table = cTable.getTable(report.headers, report.data);
        await fs.writeFile(filepath, table);
    }

    protected getHumanReportFilepath(workDir: string, id: string) {
        return path.resolve(workDir, `human-report-${id}.txt`);
    }
}
