import {ChildProcess, spawn} from 'child_process';
import * as fs from 'fs';

import {getLogger} from '@/lib/logger';

import {IWprConfig, IWprProcess} from '@/lib/wpr/types';
import {sleep} from './helpers';

export type BuildCmd = (wprConfig: IWprConfig, inputWprFilepath: string) => {command: string, args: string[]};

const logger = getLogger();

export const WAIT_TIMEOUT = 10000;
export const SLEEP_TIMEOUT_BEFORE_CHECK_PROCESS = 500;

export default abstract class WprAbstract implements IWprProcess {
    protected  _config: IWprConfig;

    protected  _process: ChildProcess | null = null;

    protected abstract _name: string = 'WprAbstract';

    protected abstract _buildCmd: BuildCmd;

    constructor(config: IWprConfig) {
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

        logger.debug(`starting ${this._name}: ${cmd.command} ${cmd.args.join(' ')}`);

        this._process = spawn(cmd.command, cmd.args);

        this._process.on('error', (error) => {
            logger.error(error);
            throw error;
        });

        this._process.on('close', (code: number) => {
            if (code > 0) {
                throw new Error(`${this._name} process exit with code: ${code}`);
            }
        });

        logger.debug(`started ${this._name} process: pid=${this._process.pid}`);

        this.process.stdout.pipe(fs.createWriteStream(stdoutFilepath));
        this.process.stderr.pipe(fs.createWriteStream(stderrFilepath));

        const sleepTimeout = SLEEP_TIMEOUT_BEFORE_CHECK_PROCESS;

        logger.debug(`sleep ${sleepTimeout}ms`);

        await sleep(sleepTimeout);
    }

    public async stop() {
        logger.debug(`stopping ${this._name} process: pid=${this.process.pid}`);
        return this.process.kill('SIGINT');
    }

    public async kill() {
        logger.debug(`killing ${this._name} process: pid=${this.process.pid}`);
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
            logger.debug(`wait while ${this._name} process (pid=${this.process.pid}) stopping`);

            const timeout = setTimeout(() => {
                reject(new Error(`wait timeout for ${this._name}: ${WAIT_TIMEOUT}ms`));
            }, WAIT_TIMEOUT);

            this.onClose((code) => {
                clearTimeout(timeout);

                if (code > 0) {
                    return reject(new Error(`${this._name} process (pid=${this.process.pid}) exit with code: ${code}`));
                }

                logger.debug(`${this._name} process (pid=${this.process.pid}) exit with code: 0`);

                resolve();
            });
        });
    }
}
