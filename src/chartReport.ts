import fs from 'fs';
import { IReport, IJsonRawReport, IConfig } from 'porchmark';
import * as d3 from 'd3';
import { JSDOM } from 'jsdom';
import { html } from './lib/template';
import { AggregationBarChart } from './lib/aggregationBarChart';
import { LineChart } from './lib/lineChart';

export class ChartReport implements IReport {
    result: string;

    constructor() {
        this.result = 'Nothing here. Use prepareData';
    }

    wrapHtml({body}: {body: string | Element}) {
        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>
                        Porchmark Report
                    </title>
                </head>
                <body>
                    ${body}
                </body>
            </html>
        `
    }

    exposeInternalView() {
        throw new Error('exposeInternalView: Not implemented');
    }

    prepareData(config: IConfig, data: IJsonRawReport) {
        const doc = (new JSDOM()).window.document;
        const body2 = d3.select(doc.body)
            .append('svg')
            .attr('viewBox', '0 0 300 300')
            .attr('style', 'max-width: 600px; max-heigth: 600px; font: 10px mono; display: block; border: 1px solid black');

        body2.selectAll('rect')
            .data([0, 40, 100, 150, 200])
            .join('rect')
            .attr('x', 0)
            .attr('y', (d, i) => d)
            .attr('width', '100')
            .attr('height', '20')
            .node()
            
        const chartChunks = data.metrics.map(metric => {
            const {name, title} = metric;

            const lineChart = data.data.allMetrics ? new LineChart().prepare({
                metrics: data.data.allMetrics[name],
                sites: data.sites,
            }).node() : '';

            const sortedLineChart = data.data.allMetrics ? new LineChart().prepare({
                metrics: Object.entries(data.data.allMetrics[name])
                    .reduce((acc: {[i: string]: number[]}, [site, values]) => {
                        acc[site] = values.sort((a, b) => a - b)
                        return acc;
                    }, {}),
                sites: data.sites,
            }).node() : '';

            const barChart = new AggregationBarChart().prepare({
                aggregations: data.data.metrics[name],
                metricName: name,
                sites: data.sites,
            }).node();

            return html`
                <div id="metric-${name}">
                    <h2> 
                        ${title || name}
                    </h2>

                    <div id="line-metric-${name}">
                        <h3>Runs</h3>
                        ${lineChart}
                    </div>

                    <div id="sorted-line-metric-${name}">
                        <h3>Sorted Runs</h3>
                        ${sortedLineChart}
                    </div>

                    <div id="bar-metric-${name}">
                        <h3>Aggregations</h3>
                        ${barChart}
                    </div>
                </div>
            `
        });

        this.result = this.wrapHtml({
            body: html`
                <div id="metrics">
                    ${chartChunks}
                </div>
            `.outerHTML
        });
    }

    saveToFs(workDir: string, id: string) {
        fs.writeFileSync(`html-report-${id}.html`, this.result);
    }
}
