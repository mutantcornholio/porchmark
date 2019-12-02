import {ChildProcess, spawn} from 'child_process';
import * as fs from 'fs';

import {Logger} from '@/lib/logger';
import {IWprConfig, IWprProcess} from '@/lib/wpr/types';
import {checkProcessByPid, sleep} from './helpers';

export type BuildCmd = (wprConfig: IWprConfig, inputWprFilepath: string) => {command: string, args: string[]};

export const WAIT_TIMEOUT = 10000;
export const SLEEP_TIMEOUT_BEFORE_CHECK_PROCESS = 500;

export default abstract class WprAbstract implements IWprProcess {
    protected _logger: Logger;
    protected  _config: IWprConfig;

    protected  _process: ChildProcess | null = null;

    protected abstract _name: string = 'WprAbstract';

    protected abstract _buildCmd: BuildCmd;

    constructor(logger: Logger, config: IWprConfig) {
        this._logger = logger;
        this._config = config;
    }

    get process(): ChildProcess {
        if (!this._process) {
            throw new Error(`no process for ${this._name}`);
        }
        return this._process;
    }

    public async start() {
        const {wprArchiveFilepath, stdoutFilepath, stderrFilepath} = this._config;

        const cmd = this._buildCmd(this._config, wprArchiveFilepath);

        this._logger.debug(`starting ${this._name}: ${cmd.command} ${cmd.args.join(' ')}`);

        this._process = spawn(cmd.command, cmd.args);

        this._logger.debug(`started ${this._name} process: pid=${this._process.pid}`);

        this.process.stdout.pipe(fs.createWriteStream(stdoutFilepath));
        this.process.stderr.pipe(fs.createWriteStream(stderrFilepath));

        const sleepTimeout = SLEEP_TIMEOUT_BEFORE_CHECK_PROCESS;

        this._logger.debug(
            `sleep ${sleepTimeout}ms before check ${this._name} process (pid=${this.process.pid}) is alive`,
        );

        await sleep(sleepTimeout);

        const isAlive = checkProcessByPid(this.process.pid);
        this._logger.debug(`${this._name} process (pid=${this.process.pid}) isAlive = ${isAlive}`);

        if (!isAlive) {
            throw new Error(
                `${this._name} process (pid=${this.process.pid}) crashed, logs: ${stdoutFilepath}, ${stderrFilepath}`,
            );
        }
    }

    public async stop() {
        this._logger.debug(`stopping ${this._name} process: pid=${this.process.pid}`);
        return this.process.kill('SIGINT');
    }

    public async kill() {
        this._logger.debug(`killing ${this._name} process: pid=${this.process.pid}`);
        return this.process.kill();
    }

    public onClose(cb: (code: number) => void) {
        this.process.on('close', cb);
    }

    public onError(cb: (err: Error) => void) {
        this.process.on('error', cb);
    }

    public wait() {
        return new Promise<void>((resolve, reject) => {
            this._logger.debug(`wait while ${this._name} process (pid=${this.process.pid}) stopping`);

            const timeout = setTimeout(() => {
                reject(new Error(`wait timeout for ${this._name}: ${WAIT_TIMEOUT}ms`));
            }, WAIT_TIMEOUT);

            this.onClose((code) => {
                clearTimeout(timeout);

                if (code > 0) {
                    return reject(new Error(`${this._name} process (pid=${this.process.pid}) exit with code: ${code}`));
                }

                this._logger.debug(`${this._name} process (pid=${this.process.pid}) exit with code: 0`);

                resolve();
            });
        });
    }
}
