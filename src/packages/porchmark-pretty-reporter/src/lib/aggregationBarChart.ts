import { ISite } from '../types/porchmark';
import * as d3 from 'd3';
import {createSvg} from './utils';

interface MetricAggregation {
    [index: string]: { // key=aggregation
        [index: string]: number; // key=site name, value = metric value
    };
};

interface Data {
    aggregations: MetricAggregation,
    metricName: string,
    sites: ISite[],
};

interface Config {
    width?: number,
    height?: number,
    lowBound?: number,
    format?: string,
    labelSize?: number,
    valueSize?: number
}

export class AggregationBarChart {
    chart: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    config: Required<Config>;
    format: (n: number) => string;
    signedFormat: (n: number) => string;

    constructor(
        {
            height = 400,
            width = 1000,
            lowBound = 0,
            format = '.2f',
            labelSize = 16,
            valueSize = 12,
        }: Config = {}
    ) {
        this.chart = createSvg();
        this.config = {
            height, width, lowBound, format, labelSize, valueSize,
        };

        this.format = d3.format(format)
        this.signedFormat = d3.format(`+${format}`)
    }

    public prepare(
        data: Data,
    ) {
        const chart = this.chart;
        const config = this.config;
        const {aggregations, sites} = data;
        const margin = {top: 30, right: 0, bottom: 30, left: 60};

        const values: number[] = Object
            .values(aggregations)
            .reduce((acc: number[], agg) => {
                acc.push(...Object.values(agg));

                return acc;
            }, [])

        const getName = (aggName: string, site: string) => `${aggName}-${site}`;

        const keys: string[] = Object
            .entries(aggregations)
            .reduce((acc: string[], [aggName, aggValues]) => {
                acc.push(...Object.keys(aggValues).map(site => getName(aggName, site)));

                return acc;
            }, [])

        const marginTop = margin.top + sites.length * config.labelSize;

        const y = d3.scaleLinear()
            .domain([config.lowBound, <number>d3.max(values)])
            .range([0, config.height - margin.bottom - marginTop])

        const x = d3.scaleBand()
            .domain(keys)
            .range([margin.left, config.width - margin.right]);

        const diffs = Object
            .values(aggregations)
            .reduce((acc: number[], aggValues) => {
                const baseline = aggValues[sites[0].name];
                const aggrDiffs = Object
                    .values(aggValues)
                    .map((val, i) => i != 0 ? val - baseline : NaN)

                acc.push(...aggrDiffs)

                return acc;
            }, [])

        // Bad typings in @types/d3
        // @ts-ignore   
        const rectData: Array<[string, number, number]> = d3.zip(keys, values, diffs);

        // Root
        chart
            .attr('style', `max-width: ${config.width}px; width: 100%; height: ${config.height}px; font: ${config.valueSize}px monospace`)
            .attr('viewBox', `0 0 ${config.width} ${config.height}`);

        // Bars
        chart
            .append('g')
            .selectAll('rect')
            .data(rectData)
            .join('rect')
            .attr('fill', 'steelblue')
            .attr('width', x.bandwidth() - 5)
            .attr('height', ([, value]) => y(value))
            .attr('y', ([, value]) => config.height - margin.bottom - y(value))
            .attr('x', ([key]) => x(key) || 0)
            ;
            
        // Values
        chart.append('g')
            .selectAll('text')
            .data(rectData)
            .join('text')
            .attr('width', x.bandwidth())
            .attr('height', 50)
            .attr('x', ([key]) => (x(key) || 0) + x.bandwidth() / 2)
            .attr('fill', 'white')
            .attr('text-anchor', 'middle')
            .text(([, value]) => this.format(value))
            .attr('y', ([, value]) => config.height - margin.bottom - y(value) + config.valueSize * 2)
            ;
        
        // diffs
        chart.append('g')
            .selectAll('text')
            .data(rectData)
            .join('text')
            .attr('width', x.bandwidth())
            .attr('height', 50)
            .attr('x', ([key]) => (x(key) || 0) + x.bandwidth() / 2)
            .attr('fill', 'white')
            .attr('text-anchor', 'middle')
            .text(([, , diff]) => Number.isNaN(diff) ? '' : this.signedFormat(diff))
            .attr('y', ([, value]) => config.height - margin.bottom - y(value) + config.valueSize * 3)
            ;

        // x-axis
        chart.append('g')
            .attr('transform', `translate(0, ${config.height - margin.bottom})`)
            .call(d3.axisBottom(x))
            ;

        // Legend
        chart.append('g')
            .attr('transform', `translate(0, 0)`)
            .attr('style', `font-size: ${config.labelSize}px`)
            .selectAll('text')
            .data(sites)
            .join('text')
            .attr('fill', 'black')
            .attr('y', (_, i) => (i + 1) * config.labelSize)
            .text((site) => `${site.name}: ${site.url}`)
            ;

        return chart;
    }
}
