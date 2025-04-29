export default class BaseVisualization {
    constructor(data, options = {}) {
        // Default dimensions
        this.width = options.width || 600;
        this.height = options.height || 400;
        
        // Create SVG container
        this.svg = d3.select(options.container || 'body')
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
            
        // Store data
        this.data = data;
        
        // Initialize margins
        this.margin = { top: 20, right: 20, bottom: 20, left: 40 };
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;
        
        // Create inner group for plot area
        this.plotGroup = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
            
        // Initialize scales
        this.xScale = d3.scaleLinear()
            .range([0, this.innerWidth]);
            
        this.yScale = d3.scaleLinear()
            .range([this.innerHeight, 0]);
    }

    createLegend() {
        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width - 200}, ${this.margin.top})`);

        return legend;
    }

    createAxes(xAxisLabel = '', yAxisLabel = '') {
        // Create x-axis
        const xAxis = d3.axisBottom(this.xScale);
        this.plotGroup.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.innerHeight})`)
            .call(xAxis)
            .append('text')
            .attr('class', 'axis-label')
            .attr('x', this.innerWidth / 2)
            .attr('y', 30)
            .style('text-anchor', 'middle')
            .text(xAxisLabel);

        // Create y-axis
        const yAxis = d3.axisLeft(this.yScale);
        this.plotGroup.append('g')
            .attr('class', 'y-axis')
            .call(yAxis)
            .append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.innerHeight / 2)
            .attr('y', -30)
            .style('text-anchor', 'middle')
            .text(yAxisLabel);
    }
}