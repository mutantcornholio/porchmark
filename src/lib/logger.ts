import * as fs from 'fs';
import * as tracer from 'tracer';

export type Logger = tracer.Tracer.Logger;

let loggerInstance: Logger;

export const createLogger = () => {
    return tracer.colorConsole({
        format: [
            '{{timestamp}} <{{title}}> {{message}}',
            {
                error: '{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})\nCall Stack:\n{{stack}}',
            },
        ],
        dateformat: 'HH:MM:ss.L',
    });
};

export const createFileLogger = (logfilepath: string) => {
    return tracer.colorConsole({
        format: [
            '{{timestamp}} <{{title}}> {{message}}',
            {
                error: '{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})\nCall Stack:\n{{stack}}',
            },
        ],
        dateformat: 'HH:MM:ss.L',
        transport(data) {
            process.stderr.write(data.output + '\n');
            fs.appendFile(logfilepath, data.rawoutput + '\n', (err) => {
                if (err) { throw err; }
            });
        },
    });
};

export function setLogger(logger: Logger) {
    loggerInstance = logger;
}

export function getLogger() {
    if (!loggerInstance) {
        throw new Error('no global logger');
    }
    return loggerInstance;
}
