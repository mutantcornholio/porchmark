import {IComparison, IConfig, IConfigMetricsAggregation} from '@/lib/config';

export type RecursivePartial<T> = {
    [P in keyof T]?:
    T[P] extends (infer U)[] ? RecursivePartial<U>[] :
        T[P] extends object ? RecursivePartial<T[P]> :
            T[P];
};

export interface IOriginalMetrics {
    [index: string]: number;
}

export type SiteName = string;

export interface ISite {
    name: SiteName;
    url: string;
}

export interface ICheckOptions {
    compareId: number;
    comparison: IComparison;
    config: IConfig;
    warmIterations: number;
}

export interface IMetric {
    name: string;
    title?: string;
}

export interface IJsonRawReportData {
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
    allMetrics: {
        // key=metric, {DCL: {"test1": [99, 98, 100], "test2": [100, 103, 102, "test3": [200, 200, 203]}}
        [index: string]: {
            [index: string]: number[],
        };
    };
}

export interface IJsonRawReport {
    sites: ISite[];
    metrics: IMetric[];
    metricAggregations: IConfigMetricsAggregation[];
    data: IJsonRawReportData;
}

export interface IReport {
    /* Obtain and convert JsonReport to internal view */
    prepareData(config: IConfig, data: IJsonRawReport): void;

    /* Flush internal data to file system */
    saveToFs(workDir: string, id: string): void;

    /* For testing purposes only */
    exposeInternalView(): any;
}
