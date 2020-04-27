import { IConfig } from '@/lib/config';
import {IJsonRawReport} from '@/lib/dataProcessor/iJsonReport';

export interface IReport {
    /* Obtain and convert JsonReport to internal view */
    prepareData(config: IConfig, data: IJsonRawReport): void;

    /* Flush internal data to file system */
    saveToFs(workDir: string, id: string): void;

    /* For testing purposes only */
    exposeInternalView(): any;

}
