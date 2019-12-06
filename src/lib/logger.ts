import * as fs from 'fs';
import * as tracer from 'tracer';

export type Logger = tracer.Tracer.Logger;

export let loggerInstance: Logger;

export let logfilePath: string | null = null;
export let logToConsole = true;

export const createLogger = () => {
    return tracer.colorConsole({
        format: [
            '{{timestamp}} <{{title}}> {{message}}',
            {
                error: '{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})\nCall Stack:\n{{stack}}',
            },
        ],
        dateformat: 'HH:MM:ss.L',
        transport(data) {
            if (logToConsole) {
                process.stderr.write(data.output + '\n');
            }

            if (logfilePath) {
                fs.appendFile(logfilePath, data.rawoutput + '\n', (err) => {
                    if (err) { throw err; }
                });
            }

        },
    });
};

export function setLogfilePath(filepath: string) {
    logfilePath = filepath;
}

export function setLogToConsole(bool: boolean) {
    logToConsole = bool;
}

export function getLogToConsole() {
    return logToConsole;
}

export function setLogger(logger: Logger) {
    loggerInstance = logger;
}

export function getLogger() {
    if (!loggerInstance) {
        throw new Error('no global logger');
    }
    return loggerInstance;
}
