import * as fs from 'fs';
import * as tracer from 'tracer';

import {viewConsole} from '@/lib/view';

export type Logger = tracer.Tracer.Logger;

let loggerInstance: Logger;

export let logfilePath: string | null = null;

export const createLogger = (level: string = 'trace') => {
    return tracer.colorConsole({
        level,
        format: [
            '{{timestamp}} <{{title}}> {{message}}',
            {
                error: '{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})\nCall Stack:\n{{stack}}',
            },
        ],
        dateformat: 'HH:MM:ss.L',
        transport(data) {
            viewConsole.info(data.output);

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

export function setLogger(logger: Logger) {
    loggerInstance = logger;
}

export function getLogger() {
    if (!loggerInstance) {
        throw new Error('no global logger');
    }
    return loggerInstance;
}

export function setLevel(level: string) {
    tracer.setLevel(level);
}
