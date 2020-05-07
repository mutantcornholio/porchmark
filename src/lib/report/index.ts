import { IConfig } from '@/lib/config';
import { IJsonRawReport, IReport } from '@/types';

type Class<T> = new () => T;

export { HumanReport } from './humanReport';
export { JsonReport } from './jsonReport';

export async function saveReports({
    id,
    workDir,
    config,
    jsonRawReport,
    reporters,
}: {
    config: IConfig,
    jsonRawReport: IJsonRawReport,
    reporters: Class<IReport>[],
    id: string,
    workDir: string,
}) {
    const reports = reporters.map((reporter) => {
        const reporterInstance = new reporter();
        reporterInstance.prepareData(config, jsonRawReport);

        return reporterInstance.saveToFs(workDir, id);
    });

    return Promise.all(reports);
}
