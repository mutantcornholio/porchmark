import blessed, {Widgets} from 'blessed';
import Table, {Cell} from 'cli-table2';
import colors from 'colors/safe';
import {Console} from 'console';
import {Writable} from 'stream';

import {IConfig} from '@/lib/config';
import {stdoutRect} from '@/lib/helpers';
import {calculatingStats} from '@/lib/stats';

const splitByColsRegex = new RegExp('.{1,' + process.stdout.columns + '}', 'g');

class ConsoleStream extends Writable {
    public logs: string[] = [];
    public renderFn: () => void = () => { throw new Error('renderFn not set'); };

    public _write(chunk: string | Buffer, _: any, callback: (error?: Error | null) => void): void {
        const strings = chunk.toString().split('\n');

        for (const str of strings) {
            const splittedStrings = str.match(splitByColsRegex);

            if (splittedStrings === null) {
                this.logs.push(str);
            } else {
                this.logs.push(...splittedStrings);
            }
        }

        callback();
        this.renderFn();
    }
}

// tslint:disable-next-line max-classes-per-file
class TableView {
    public viewConsole: Console;

    protected _config?: IConfig;
    protected _screen?: Widgets.Screen;
    protected _box?: Widgets.BoxElement;
    protected tableText: string = '';
    protected logs: string[] = [];
    protected logStream: ConsoleStream;

    protected metrCount: number = 0;
    protected columns: number = 0;
    protected statNameWidth: number = 0;
    protected metrColumnWidth: number = 0;
    protected maxSitenameWidth: number = 0;

    protected paddedSitenames: string[] = [];
    protected maxLength: number = 0;
    protected spaceInsufficiency: number = 0;

    constructor() {
        this.logStream = new ConsoleStream();
        this.logStream.logs = this.logs;
        this.logStream.renderFn = this.render;

        this.viewConsole = new Console(this.logStream, this.logStream);

    }

    get config() {
        if (!this._config) {
            throw new Error('TableView not inited, no config');
        }

        return this._config;
    }

    set config(config: IConfig) {
        this._config = config;
    }

    get screen(): Widgets.Screen {
        if (!this._screen) {
            throw new Error('Screen not inited');
        }

        return this._screen;
    }

    set screen(screen: Widgets.Screen) {
        this._screen = screen;
    }

    get box(): Widgets.BoxElement {
        if (!this._box) {
            throw new Error('Box not inited');
        }

        return this._box;
    }

    set box(box: Widgets.BoxElement) {
        this._box = box;
    }

    public init = () => {
        if (this.config.silent) {
            return;
        }

        this.metrCount = this.config.metrics.filter((metric) => metric.showInTable).length * 2;

        this.columns = stdoutRect()[1] - 1;
        this.statNameWidth = Math.max.apply(null, calculatingStats.map((stat) => stat.name.length)) + 2;
        this.metrColumnWidth = Math.floor(
            (this.columns - this.statNameWidth - (this.metrCount + 2)) / (this.metrCount + 2),
        );
        this.maxSitenameWidth = this.metrColumnWidth * 2 - 2;

        this.screen = blessed.screen({
            smartCSR: true,
        });
        this.box = blessed.box({});
        // @ts-ignore TODO no append method in Widgets.Screen
        this.screen.append(this.box);
    }

    public renderTable = ({sites, paintedMetrics, paintedDiffs, iterations, activeTests}: {
        sites: string[],
        paintedMetrics: Array<string|null>[][],
        paintedDiffs: Array<string|null>[][],
        iterations: number[],
        activeTests: number[],
    }) => {
        if (this.config.silent) {
            return;
        }

        const table = new Table({
            head: [
                '',
                '',
                ...this.config.metrics.filter((metric) => metric.showInTable)
                    .map((metric) => ({content: metric.title || metric.name, colSpan: 2})),
            ],
            colAligns: ['left', 'right', ...Array(this.metrCount).fill('right')],
            colWidths: [
                this.metrColumnWidth * 2,
                this.statNameWidth,
                ...Array(this.metrCount).fill(this.metrColumnWidth),
            ],
            wordWrap: true,
        }) as Table.HorizontalTable;

        const trimmedSitenames = this.trimSitenames(sites);

        for (let siteIndex = 0; siteIndex < sites.length; siteIndex++) {
            const header = trimmedSitenames[siteIndex] +
                `\niterations: ${iterations[siteIndex]}` +
                `\nactive tests: ${activeTests[siteIndex]}`;

            const statsToDisplay = siteIndex === 0 ?
                calculatingStats.filter((stat) => stat.applicableToReference)
                : calculatingStats
            ;

            const resultRow: Cell[] = [header, statsToDisplay.map((stat) => stat.name).join('\n')];

            for (let metricIndex = 0; metricIndex < this.config.metrics.length; metricIndex++) {
                const metric = this.config.metrics[metricIndex];
                if (!metric.showInTable) {
                    continue;
                }

                resultRow.push(
                    paintedMetrics[siteIndex][metricIndex].join('\n'),
                    paintedDiffs[siteIndex][metricIndex].join('\n'),
                );
            }

            table.push(resultRow);
        }

        this.tableText = table.toString();

        this.render();
    }

    public render = () => {
        const rows = stdoutRect()[0];

        const tableLines = this.tableText.split('\n');

        const tableHeight = (tableLines.length);
        const maxLogs = rows - tableHeight - 1;

        if (this.logs.length > maxLogs) {
            this.logs.splice(0, this.logs.length - maxLogs);
        }

        this.box.setContent([...tableLines, ...this.logs].join('\n'));
        this.screen.render();
    }

    public shutdown = (errorHappened: boolean) => {
        if (!this.config.silent) {
            this.screen.destroy();

            if (this.tableText) {
                // tslint:disable-next-line no-console
                console.log(this.tableText);
            }

            if (this.logs.length > 0) {
                // tslint:disable-next-line no-console
                console.error(`\nLast logs:\n${this.logs.join('\n')}`);
            }
        }

        process.exit(errorHappened ? 1 : 0);
    }

    public emergencyShutdown = (error: Error) => {
        this.viewConsole.log(error);
        this.shutdown(true);
    }

    public trimSitenames = (sites: string[]): string[] => {
        if (!this.paddedSitenames.length) {
            this.maxLength = Math.max(...sites.map((site) => site.length));

            this.paddedSitenames = sites.map((site) => {
                const pad = Math.ceil((this.maxLength - site.length) / 2);

                return site.padEnd(pad).padStart(pad);
            });

            this.spaceInsufficiency = this.maxLength - this.maxSitenameWidth;
        }

        const shifter = (Date.now() / 200) % (this.spaceInsufficiency * 2.5) - this.spaceInsufficiency * 0.25;
        let position: number;
        if (shifter < 0) {
            position = 0;
        } else if (shifter < this.spaceInsufficiency) {
            position = shifter;
        } else if (shifter < this.spaceInsufficiency * 1.25) {
            position = this.spaceInsufficiency;
        } else if (shifter < this.spaceInsufficiency * 2) {
            position = 2 * this.spaceInsufficiency - shifter;
        } else if (shifter < this.spaceInsufficiency * 2) {
            position = 0;
        }

        return this.paddedSitenames.map((site) => colors.green(site.slice(position)));
    }
}

const view: TableView = new TableView();

export const getView = (): TableView => {
    if (!view) {
        throw new Error('TableView not inited');
    }

    return view;
};

export const getViewConsole = (): Console => getView().viewConsole;
