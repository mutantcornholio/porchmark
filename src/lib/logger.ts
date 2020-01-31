import * as path from 'path';

import {isInteractive} from '@/lib/helpers';
import * as fs from 'fs';
import * as tracer from 'tracer';

import {getViewConsole} from '@/lib/view';

const viewConsole = getViewConsole();

export type Logger = tracer.Tracer.Logger;

let loggerInstance: Logger;

export let logfilePath: string = path.resolve(process.cwd(), 'porchmark.log');

let logfileDescriptor: number | null = null;

function closeFileDescriptor(descriptor: number | null): void {
    if (descriptor) {
        fs.closeSync(descriptor);
    }
}

process.on('beforeExit', function handleBeforeExit() {
    loggerInstance.info('exitHandler call');
    closeFileDescriptor(logfileDescriptor);
});

export const createLogger = (level: string = 'trace') => {
    const loggerCreator = isInteractive() ? tracer.colorConsole : tracer.console;

    return loggerCreator({
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

                if (!logfileDescriptor) {
                    logfileDescriptor = fs.openSync(logfilePath, 'a');
                }

                fs.write(logfileDescriptor, data.rawoutput + '\n', (err) => {
                    if (err) { throw err; }
                });
            }

        },
    });
};

export function setLogfilePath(filepath: string) {
    closeFileDescriptor(logfileDescriptor);
    logfilePath = filepath;
    logfileDescriptor = fs.openSync(logfilePath, 'a');
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
