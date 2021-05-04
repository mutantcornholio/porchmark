import getDefaultConfig from '@/lib/config/default';
import {isoDate} from '@/lib/helpers';
import { HumanReport } from '../humanReport';
import { JsonReport } from '../jsonReport';
import { humanReportResult, isoDate as isoDateMock, jsonRawReportResult, jsonReportResult} from './mock';

jest.mock('@/lib/helpers', () => ({
    isoDate: jest.fn(() => isoDateMock),
}));

describe('Reports:', () => {

    describe('humanReport', () => {
        it('provides table-view of raw json report', () => {
            const reporter = new HumanReport();
            reporter.prepareData({
                startedAt: isoDate(),
                completedAt: isoDate(),
                status: 'success',
                statusMessage: 'okay',
                config: getDefaultConfig(),
                report: jsonRawReportResult,
            });

            expect(reporter.exposeInternalView()).toEqual(humanReportResult);
        });
    });

    describe('jsonReport', () => {
        it('provides json report', () => {
            const reporter = new JsonReport();
            reporter.prepareData({
                startedAt: isoDate(),
                completedAt: isoDate(),
                status: 'success',
                statusMessage: 'okay',
                config: getDefaultConfig(),
                report: jsonRawReportResult,
            });

            expect(reporter.exposeInternalView()).toEqual(jsonReportResult);
        });
    });
});
