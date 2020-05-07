import getDefaultConfig from '@/lib/config/default';
import { HumanReport } from '../humanReport';
import { JsonReport } from '../jsonReport';
import { humanReportResult, jsonRawReportResult, jsonReportResult} from './mock';

describe('Reports:', () => {

    describe('humanReport', () => {
        it('provides table-view of raw json report', () => {
            const reporter = new HumanReport();
            reporter.prepareData(getDefaultConfig(), jsonRawReportResult);

            expect(reporter.exposeInternalView()).toEqual(humanReportResult);
        });
    });

    describe('jsonReport', () => {
        it('provides json report', () => {
            const reporter = new JsonReport();
            reporter.prepareData(getDefaultConfig(), jsonRawReportResult);

            expect(reporter.exposeInternalView()).toEqual(jsonReportResult);
        });
    });
});
