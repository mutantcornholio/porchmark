import {ChildProcess} from 'child_process';

import {Logger} from '@/lib/logger';

export interface IBaseWprConfig {
    bin: string;
    certFile: string;
    keyFile: string;
    injectScripts: string;
    // verbose: boolean;
}

export interface IWprConfig extends IBaseWprConfig {
    httpPort: number;
    httpsPort: number;
    wprArchiveFilepath: string;
    stdoutFilepath: string;
    stderrFilepath: string;
}

export interface IWprProcess {
    process: ChildProcess;
    start(): Promise<void>;
    stop(): Promise<void>;
    kill(): Promise<void>;
    onClose(cb: (code: number) => void): void;
}

export type IWprProcessConstructor = new(logger: Logger, config: IWprConfig, archiveFilepath: string) => IWprProcess;
