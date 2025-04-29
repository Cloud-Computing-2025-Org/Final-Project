import BaseVisualization from "./baseVis.js"

export default class EngagementVisualization extends BaseVisualization {
    constructor(data, options = {}) {
        super(data, options);
        
        // Create date parser for YEAR-WEEK format
        this.parseDate = d3.timeParse("%Y-%U");
        
        // Convert string dates to actual dates
        const xDomain = data.map(d => {
            return this.parseDate(`${+d.YEAR}-${String(+d.WEEK_NUM).padStart(2, '0')}`);
        });
        
        // Create time scale
        this.xScale = d3.scaleTime()
            .domain(d3.extent(xDomain))
            .range([this.margin.left, this.innerWidth]);
            
        // Separate y-scales for spend and households
        this.spendYScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.total_spend) * 1.1])
            .range([this.innerHeight - this.margin.bottom, this.margin.top]);
            
        this.householdsYScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.unique_households) * 1.1])
            .range([this.innerHeight - this.margin.bottom, this.margin.top]);
            
        // Create axes
        this.createAxes();
        this.createLines();
        this.createLegend();
    }

    createAxes() {
        // X-axis with combined week/year labels
        const xAxis = d3.axisBottom(this.xScale)
            .tickFormat(d3.timeFormat("%U (%Y)"))
            .ticks(10);
            
        // Y-axis for spend (left)
        const spendYAxis = d3.axisLeft(this.spendYScale)
            .tickFormat(d3.format(",.0f"));
            
        // Y-axis for households (right)
        const householdsYAxis = d3.axisRight(this.householdsYScale)
            .tickFormat(d3.format(",.0f"));
            
        // Add axes to SVG
        this.plotGroup.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${this.innerHeight - this.margin.bottom})`)
            .call(xAxis);
            
        this.plotGroup.append('g')
            .attr('class', 'axis y-axis spend-axis')
            .attr('transform', `translate(${this.margin.left},0)`)
            .call(spendYAxis);
            
        this.plotGroup.append('g')
            .attr('class', 'axis y-axis household-axis')
            .attr('transform', `translate(${this.innerWidth - this.margin.right*2},0)`)
            .call(householdsYAxis);
            
        // Add axis labels
        this.plotGroup.append('text')
            .attr('transform', `translate(${-this.margin.left},${this.innerHeight/2})rotate(-90)`)
            .attr('y', 6)
            .attr('dy', '.71em')
            .style('text-anchor', 'end')
            .text('Total Spend');
            
        this.plotGroup.append('text')
            .attr('transform', `translate(${this.innerWidth},${this.innerHeight*.75})rotate(90)`)
            .attr('y', -6)
            .attr('dy', '.71em')
            .style('text-anchor', 'end')
            .text('Unique Households');
    }

    createLines() {
        // Line generators with separate y-scales
        const spendLine = d3.line()
            .x(d => this.xScale(this.parseDate(`${+d.YEAR}-${String(+d.WEEK_NUM).padStart(2, '0')}`)))
            .y(d => this.spendYScale(d.total_spend));
            
        const householdsLine = d3.line()
            .x(d => this.xScale(this.parseDate(`${+d.YEAR}-${String(+d.WEEK_NUM).padStart(2, '0')}`)))
            .y(d => this.householdsYScale(d.unique_households));
            
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
        const legendItems = [
            { label: 'Total Spend', color: '#FF6B6B' },
            { label: 'Unique Households', color: '#4ECDC4' }
        ];
        
        legend.selectAll('.legend-item')
            .data(legendItems)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 25})`);
            
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