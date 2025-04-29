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

        // Create time scale with padding to prevent points going off screen
        this.xScale = d3.scaleTime()
            .domain([
                d3.min(xDomain),
                d3.max(xDomain)
            ])
            .range([this.margin.left, this.innerWidth-this.margin.left]);

        // Separate y-scales for spend and households
        this.spendYScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.total_spend) * 1.1])
            .range([this.innerHeight - this.margin.bottom, this.margin.top]);

        this.householdsYScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.unique_households) * 1.1])
            .range([this.innerHeight - this.margin.bottom, this.margin.top]);

        // Add tooltip div
        this.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        // Create axes
        this.createAxes();
        this.createLines();
        this.createLegend();

        // add title
        this.createTitle("Customer Engagement Over Time")
    }

    createAxes() {
        // X-axis with MM/YY format and 5 ticks
        const xAxis = d3.axisBottom(this.xScale)
            .tickFormat(d3.timeFormat("%m/%Y"))
            .ticks(5);

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
            .attr('transform', `translate(${this.innerWidth-this.margin.left},0)`) // Fixed right axis position
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
        const self = this;

        // Line generators with separate y-scales
        const spendLine = d3.line()
            .x(d => this.xScale(this.parseDate(`${+d.YEAR}-${String(+d.WEEK_NUM).padStart(2, '0')}`)))
            .y(d => this.spendYScale(d.total_spend));

        const householdsLine = d3.line()
            .x(d => this.xScale(this.parseDate(`${+d.YEAR}-${String(+d.WEEK_NUM).padStart(2, '0')}`)))
            .y(d => this.householdsYScale(d.unique_households));

        // Add lines to plot
        const spendPath = this.plotGroup.append('path')
            .datum(this.data)
            .attr('class', 'line spend-line')
            .attr('fill', 'none')
            .attr('stroke', '#FF6B6B') 
            .attr('stroke-width', 2)
            .attr('d', spendLine);

        const householdsPath = this.plotGroup.append('path')
            .datum(this.data)
            .attr('class', 'line household-line')
            .attr('fill', 'none')
            .attr('stroke', '#4ECDC4') 
            .attr('stroke-width', 2)
            .attr('d', householdsLine);

        // Add hover interaction
        this.addHoverLine();

        this.plotGroup
            .append('rect')
            .attr('class', 'overlay')
            .attr('x', this.margin.left)
            .attr('y', this.margin.top)
            .attr('width', this.innerWidth)
            .attr('height', this.innerHeight - this.margin.bottom * 2)
            .style('opacity', 0)
            .on('mouseover', () => {
                self.tooltip.style('opacity', 1);
            })
            .on('mouseout', () => {
                self.tooltip.style('opacity', 0);
            })
            .on('mousemove', function(event) {
                const [mouseX] = d3.pointer(event);
                const d = self.findNearestDataPoint(mouseX);
                // Update tooltip position and content
                self.tooltip
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 10}px`)
                .html(`
                <div>Year: ${d.YEAR}</div>
                <div>Week: ${String(d.WEEK_NUM).padStart(2, '0')}</div>
                <div>Spend: $${d3.format(",.0f")(d.total_spend)}</div>
                <div>Households: ${d3.format(",.0f")(d.unique_households)}</div>
                `);
            });
    }

    addHoverLine() {
        // Create vertical line that will follow cursor
        this.hoverLine = this.plotGroup.append('line')
            .attr('class', 'hover-line')
            .attr('x1', this.margin.left)  // Start at left margin
            .attr('x2', this.margin.left)  // Start at left margin
            .attr('y1', this.margin.top)
            .attr('y2', this.innerHeight - this.margin.bottom)
            .attr('stroke', '#666')
            .attr('stroke-dasharray', '4')
            .attr('opacity', 0)
            .style('pointer-events', 'none');
    
        // Add hover interaction
        this.plotGroup
            .on('mousemove', (event) => {
                const [x] = d3.pointer(event);
                
                // Only show hover line if within axis range
                if (x >= this.margin.left && x <= this.innerWidth) {
                    this.hoverLine
                        .attr('x1', x)
                        .attr('x2', x)
                        .attr('opacity', 1);
                } else {
                    this.hoverLine.attr('opacity', 0);
                }
            })
            .on('mouseleave', () => {
                this.hoverLine
                    .attr('opacity', 0);
            });
    }

    findNearestDataPoint(mouseX) {
        const xScale = this.xScale;
        const parseDate = this.parseDate;
        const data = this.data;

        let minDistance = Infinity;
        let nearestIndex = -1;

        // Convert mouse X position back to date
        const mouseDate = xScale.invert(mouseX);

        // Find the closest data point based on date
        data.forEach((d, i) => {
            const currentDate = parseDate(`${+d.YEAR}-${String(+d.WEEK_NUM).padStart(2, '0')}`);
            const distance = Math.abs(currentDate - mouseDate);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestIndex = i;
            }
        });

        return data[nearestIndex];
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

// Add styling
const styles = `
.tooltip {
    position: absolute;
    padding: 10px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #ddd;
    border-radius: 4px;
    pointer-events: none;
    font-family: Arial, sans-serif;
}
.tooltip div {
    margin: 5px 0;
    font-size: 14px;
}
.overlay {
    fill: none;
    pointer-events: all;
}
.line {
    transition: opacity 0.2s;
}
.legend-item circle {
    stroke-width: 2px;
}
`;

// Add styles to document
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);