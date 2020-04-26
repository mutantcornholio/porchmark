import { IComparison, IConfig } from '@/lib/config';
import getDefaultConfig from '@/lib/config/default';
import { DataProcessor } from '..';
import { humanReportResult, jsonReportResult, rawMetrics, sites } from './mock';

jest.mock('@/lib/logger', () => ({
    getLogger: jest.fn().mockImplementation(() => ({
        log: () => undefined,
        trace: () => undefined,
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
        fatal: () => undefined,
    })),
}));

describe('DataProcessor:', () => {
    let config: IConfig;
    let comparision: IComparison;
    let dataProccessor: DataProcessor;

    beforeAll(() => {
        [config, comparision] = prepareConfigAndComparision();
        dataProccessor = new DataProcessor(config, comparision);
        prepareDataInDataProcessor(dataProccessor);
    });

    describe('calcReports', () => {
        it('human report', async () => {
            const {humanReport} = await dataProccessor.calcReports(sites);

            expect(humanReport).toEqual(humanReportResult);
        });

        it('json report', async () => {
            const {jsonReport} = await dataProccessor.calcReports(sites);

            expect(jsonReport).toEqual(jsonReportResult);
        });
    });
});

const prepareConfigAndComparision = (): [IConfig, IComparison] => {
    const config: IConfig = getDefaultConfig();
    const comparision: IComparison = {
        name: 'compare',
        sites,
    };

    config.comparisons.push(comparision);

    return [config, comparision];
};

const prepareDataInDataProcessor = (dataProccessor: DataProcessor) => {
    for (const [siteIndex, metrics] of rawMetrics.entries()) {

        // Transposing back raw data of dataProcessor to emulate working of workerFarm
        const transposed: number[][] = [];
        for (const metricValues of metrics) {
            for (const [metricValueIndex, metricValue] of metricValues.entries()) {
                if (!transposed[metricValueIndex]) {
                    transposed.push([]);
                }
                transposed[metricValueIndex].push(metricValue);
            }
        }

        for (const measurement of transposed) {
            dataProccessor.registerMetrics(siteIndex, measurement);
        }
    }

    dataProccessor.calculateResults();
};
