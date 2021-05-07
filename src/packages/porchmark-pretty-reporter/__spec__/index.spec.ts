import {ChartReport} from '../chartReport';
import config from './config.mock';
import rawReport from './jsonRawReport.mock';

describe('such usefull', () => {
    it('much test', () => {

        // tslint:disable-next-line:no-console
        console.info('Run reporter with mock...');

        const reporter = new ChartReport();
        reporter.prepareData({
            startedAt: '',
            completedAt: '',
            status: '',
            statusMessage: '',
            config,
            report: rawReport,
        });
        reporter.saveToFs('.', 'report');

        expect(2 + 2).toBe(4);
    });
});
