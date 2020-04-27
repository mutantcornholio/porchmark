import { IConfig } from '@/lib/config';
import { IJsonRawReport } from '@/lib/dataProcessor/iJsonReport';
import { IReport } from './iReport';

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
