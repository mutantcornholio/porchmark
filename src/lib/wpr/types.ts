import {ChildProcess} from 'child_process';

export interface IBaseWprConfig {
    bin: string;
    certFile: string;
    keyFile: string;
    injectScripts: string;
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
    wait(): Promise<void>;
}

export interface IWprProcessOptions {
    wprArchiveFilepath: string;
    httpPort: number;
    httpsPort: number;
    stdoutFilepath: string;
    stderrFilepath: string;
}
