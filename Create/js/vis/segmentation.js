import BaseVisualization from "./baseVis.js"

export default class SegmentationVisualization extends BaseVisualization {
    constructor(data, options = {}) {
        super(data, options);
        
        // Set up scales
        this.xScale.domain([
            d3.min(data, d => d.WEEK_NUM),
            d3.max(data, d => d.WEEK_NUM)
        ]);
        
        this.yScale.domain([
            0,
            Math.max(
                d3.max(data, d => d.total_spend),
                d3.max(data, d => d.unique_households)
            ) * 1.1
        ]);

        // Create lines
        this.createLines();
        this.createLegend();
    }

    createLines() {
        // Line generators
        const spendLine = d3.line()
            .x(d => this.xScale(d.WEEK_NUM))
            .y(d => this.yScale(d.total_spend));

        const householdsLine = d3.line()
            .x(d => this.xScale(d.WEEK_NUM))
            .y(d => this.yScale(d.unique_households));

        // Add lines to plot
        this.plotGroup.append('path')
            .datum(this.data)
            .attr('class', 'line spend-line')
            .attr('fill', 'none')
            .attr('stroke', '#FF6B6B') // Red
            .attr('stroke-width', 2)
            .attr('d', spendLine);

        this.plotGroup.append('path')
            .datum(this.data)
            .attr('class', 'line household-line')
            .attr('fill', 'none')
            .attr('stroke', '#4ECDC4') // Teal
            .attr('stroke-width', 2)
            .attr('d', householdsLine);
    }

    createLegend() {
        const legend = super.createLegend();

        // Legend items
        const legendItems = [
            { label: 'Total Spend', color: '#FF6B6B' },
            { label: 'Unique Households', color: '#4ECDC4' }
        ];

        // Create legend entries
        legend.selectAll('.legend-item')
            .data(legendItems)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 25})`);

        // Add legend circles and text
        legend.selectAll('.legend-item')
            .append('circle')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', 5)
            .attr('fill', d => d.color);

        legend.selectAll('.legend-item')
            .append('text')
            .attr('x', 10)
            .attr('y', 5)
            .attr('font-size', '12px')
            .text(d => d.label);
    }
}