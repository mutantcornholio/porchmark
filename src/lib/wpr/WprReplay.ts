import {ChildProcess, spawn} from 'child_process';
import * as fs from 'fs';

import {Logger} from '@/lib/logger';

import {SLEEP_TIMEOUT_BEFORE_CHECK_PROCESS, WAIT_TIMEOUT} from '.';
import {checkProcessByPid, sleep} from './helpers';
import {IWprConfig, IWprProcess} from './types';

export const buildWprReplayCmd = (wprConfig: IWprConfig, inputWprFilepath: string) => {
    return {
        command: wprConfig.bin,
        args: [
            'replay',
            '--https_cert_file', wprConfig.certFile,
            '--https_key_file', wprConfig.keyFile,
            '--http_port', String(wprConfig.httpPort),
            '--https_port', String(wprConfig.httpsPort),
            '--inject_scripts', wprConfig.injectScripts,
            inputWprFilepath,
        ],
    };
};

export default class WprReplay implements IWprProcess {
    protected _logger: Logger;
    protected  _config: IWprConfig;

    protected  _process: ChildProcess | null = null;

    constructor(logger: Logger, config: IWprConfig) {
        this._logger = logger;
        this._config = config;
    }

    get process(): ChildProcess {
        if (!this._process) { throw new Error('no process for WprReplay'); }
        return this._process;
    }

    public async start() {
        const {wprArchiveFilepath, stdoutFilepath, stderrFilepath} = this._config;
        const cmd = buildWprReplayCmd(this._config, wprArchiveFilepath);
        this._logger.debug(`starting wpr replay: ${cmd.command} ${cmd.args.join(' ')}`);

        this._process = spawn(cmd.command, cmd.args);

        this._logger.debug(`started wpr replay process: pid=${this._process.pid}`);

        this.process.stdout.pipe(fs.createWriteStream(stdoutFilepath));
        this.process.stderr.pipe(fs.createWriteStream(stderrFilepath));

        const sleepTimeout = SLEEP_TIMEOUT_BEFORE_CHECK_PROCESS;

        this._logger.debug(
            `sleep ${sleepTimeout}ms before check wpr replay process (pid=${this.process.pid}) is alive`,
        );
        await sleep(sleepTimeout);

        const isAlive = checkProcessByPid(this.process.pid);
        this._logger.debug(`wpr replay process (pid=${this.process.pid}) isAlive = ${isAlive}`);

        if (!isAlive) {
            throw new Error(
                `wpr replay process (pid=${this.process.pid}) crashed, logs: ${stdoutFilepath}, ${stderrFilepath}`,
            );
        }
    }

    public async stop() {
        this._logger.debug(`stopping wpr replay process: pid=${this.process.pid}`);
        return this.process.kill('SIGINT');
    }

    public async kill() {
        this._logger.debug(`killing wpr replay process: pid=${this.process.pid}`);
        return this.process.kill();
    }

    public onClose(cb: (code: number) => void) {
        this.process.on('close', cb);
    }

    public onError(cb: (err: Error) => void) {
        this.process.on('error', cb);
    }

    public wait() {
        return new Promise((resolve, reject) => {
            this._logger.debug(`wait while replay process (pid=${this.process.pid}) stopping`);

            const timeout = setTimeout(() => {
                reject(new Error('wait for replay process timeouted'));
            }, WAIT_TIMEOUT);

            this.onClose((code) => {
                clearTimeout(timeout);

                if (code > 0) {
                    return reject(new Error(`wpr replay process (pid=${this.process.pid}) exit with code: ${code}`));
                }

                this._logger.debug(`wpr replay process (pid=${this.process.pid}) exit with code: 0`);

                resolve();
            });
        });
    }
}
