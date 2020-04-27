
import { ISite } from '@/types';
import { IConfigMetricsAggregation } from '../config';

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
