import { ISite } from 'porchmark';
import * as d3 from 'd3';
import { createSvg } from './utils';

interface Config {
    width?: number,
    height?: number,
    format?: string,
    labelSize?: number,
    valueSize?: number
};

interface Data {
    metrics: {[site: string]: number[]},
    sites: ISite[],
}

export class LineChart {
    chart: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    config: Required<Config>
    format: (n: number) => string

    constructor({
        height = 400,
        width = 1000,
        format = '.2f',
        labelSize = 16,
        valueSize = 12,
    }: Config = {}) {
        this.chart = createSvg();
        this.config = {
            height,
            width,
            format,
            labelSize,
            valueSize,
        };

        this.format = d3.format(format)
    }

    prepare(data: Data) {
        const chart = this.chart;
        const config = this.config;
        const {metrics, sites} = data;
        const margin = {top: 30, right: 60, bottom: 30, left: 60};

        const marginTop = margin.top + sites.length * config.labelSize;

        const allValues = Object.values(metrics).reduce((acc: number[], siteValues) => {
            acc.push.apply(acc, siteValues);
            return acc;
        }, []);

        const valuesCount = Object.values(metrics)[0].length;

        const y = d3.scaleLinear()
            .domain([<number>d3.min(allValues) * 0.995, <number>d3.max(allValues) * 1.005])
            .range([config.height - margin.bottom, marginTop])

        const x = d3.scaleLinear()
            .domain([0, valuesCount - 1])
            .range([margin.left, config.width - margin.right]);

        const xT = d3.scaleBand()
            .domain(d3.range(valuesCount - 1).map(String))
            .range([margin.left, config.width - margin.right])
        
        const colors = <d3.ScaleOrdinal<string, string>>d3.scaleOrdinal()
            .domain(Object.keys(metrics))
            .range(d3.schemeTableau10);

        // Root
        chart
            .attr('style', `max-width: ${config.width}px; width: 100%; height: ${config.height}px; font: ${config.valueSize}px monospace`)
            .attr('viewBox', `0 0 ${config.width} ${config.height}`)
            .append('style')
            .text('.title {fill: transparent} .title:hover {fill: rgba(70, 130, 180, 0.3); }; ');
            
        // Lines
        Object.entries(metrics).forEach(([site, data]) => {
            const line = d3.line<number>()
                .x((d, i) => x(i))
                .y((d) => y(d));

            const g = chart.append('g')
            
            g.append('path')
                .attr('d', line(data) || '')
                .attr('fill', 'none')
                .attr("stroke", colors(site))
                .attr("stroke-width", 1.5)
                .attr("stroke-miterlimit", 1)
                ;

            g.selectAll('circle')
                .data(data)
                .join('circle')
                .attr('cx', (d, i) => x(i))
                .attr('cy', d => y(d))
                .attr('r', 2)
                .attr('fill', colors(site))
                ;
            
            g.selectAll('rect')
                .data(data)
                .join('rect')
                .attr('class', 'title')
                .attr('width', xT.bandwidth())
                .attr('height', config.height - marginTop - margin.bottom)
                .attr('x', (d, i) => x(i) - xT.bandwidth() / 2)
                .attr('y', marginTop)
                .append('title')
                .text((d, i) => {
                    const x = `x: ${i}/${valuesCount - 1} (${this.format((i + 1) / valuesCount)});`
                    const y =  `y: ${this.format(d)};`
                    return `${x} ${y}`
                })
                ;
        }); 

        // x-axis
        chart.append('g')
            .attr('transform', `translate(0, ${config.height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(valuesCount))
            ;

        // y-axis
        chart.append('g')
            .attr('transform', `translate(${margin.left})`)
            .call(d3.axisLeft(y))
            ;

        // y-axis right
        chart.append('g')
            .attr('transform', `translate(${config.width - margin.right})`)
            .call(d3.axisRight(y))
            ;

        // Legend
        chart.append('g')
            .attr('transform', `translate(0, 0)`)
            .attr('style', `font-size: ${config.labelSize}px`)
            .selectAll('text')
            .data(sites)
            .join('text')
            .attr('fill', site => colors(site.name))
            .attr('y', (_, i) => (i + 1) * config.labelSize)
            .text(site => {
                const min = this.format(d3.min(metrics[site.name]) || 0);
                const max = this.format(d3.max(metrics[site.name]) || 0);
                const q95 = this.format(d3.quantile(metrics[site.name], 95) || 0);

                return `min: ${min}; max: ${max}; q95: ${q95}; ${site.name}: ${site.url};`;
            })
            ;

        return chart;
    }
}
