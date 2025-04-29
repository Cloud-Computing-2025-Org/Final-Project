import BaseVisualization from "./baseVis.js"

export default class ChurnVisualization extends BaseVisualization {
    constructor(data, options = {}) {
        super(data, options);
        
        // Convert dates to days since first purchase
        const parseDate = d3.timeParse("%d-%b-%y");
        const formatDate = d3.timeFormat("%d-%b-%y");
        
        // Transform data for regression
        this.transformedData = this.data.map(d => ({
            x: Date.parse(parseDate(d.last_purchase_date)) / (1000 * 60 * 60 * 24),
            y: d.HSD_NUM
        }));

        // Calculate regression
        const regression = this.calculateRegression();
        
        // Set domains based on regression
        this.xScale.domain(d3.extent(this.transformedData, d => d.x));
        this.yScale.domain(d3.extent(this.transformedData, d => d.y));

        // Create axes with meaningful labels
        this.createAxes("Days Since First Purchase", "Churn Score");

        // Add points
        this.plotPoints();
        
        // Add regression line
        this.addRegressionLine(regression);
        
        // Add prediction line
        this.addPredictionLine(regression);

        // Add title
        this.createTitle("Churn Predicition")
    }

    calculateRegression() {
        const xValues = this.transformedData.map(d => d.x);
        const yValues = this.transformedData.map(d => d.y);

        let sum_x = 0;
        let sum_y = 0;
        let sum_xy = 0;
        let sum_xx = 0;
        let n = xValues.length;

        for (let i = 0; i < n; i++) {
            sum_x += xValues[i];
            sum_y += yValues[i];
            sum_xy += xValues[i] * yValues[i];
            sum_xx += xValues[i] * xValues[i];
        }

        const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
        const intercept = (sum_y - slope * sum_x) / n;

        return { slope, intercept };
    }

    plotPoints() {
        this.plotGroup.selectAll("circle")
            .data(this.transformedData)
            .enter()
            .append("circle")
            .attr("cx", d => this.xScale(d.x))
            .attr("cy", d => this.yScale(d.y))
            .attr("r", 5)
            .attr("fill", "#2196F3");
    }

    addRegressionLine(regression) {
        const line = d3.line()
            .x(d => this.xScale(d.x))
            .y(d => this.yScale(regression.slope * d.x + regression.intercept));

        this.plotGroup.append("path")
            .datum(this.transformedData)
            .attr("class", "regression-line")
            .attr("fill", "none")
            .attr("stroke", "#FF5722")
            .attr("stroke-width", 2)
            .attr("d", line);
    }

    addPredictionLine(regression) {
        const futureDays = 30; // Predict next 30 days
        const lastDate = Math.max(...this.transformedData.map(d => d.x));
        const predictionPoint = {
            x: lastDate + (futureDays * 24 * 60 * 60),
            y: regression.slope * (lastDate + (futureDays * 24 * 60 * 60)) + regression.intercept
        };

        this.plotGroup.append("line")
            .attr("class", "prediction-line")
            .attr("x1", this.xScale(lastDate))
            .attr("y1", this.yScale(regression.slope * lastDate + regression.intercept))
            .attr("x2", this.xScale(predictionPoint.x))
            .attr("y2", this.yScale(predictionPoint.y))
            .attr("stroke", "#FF5722")
            .attr("stroke-dasharray", "5,5")
            .attr("opacity", 0.7);

        this.plotGroup.append("circle")
            .attr("cx", this.xScale(predictionPoint.x))
            .attr("cy", this.yScale(predictionPoint.y))
            .attr("r", 6)
            .attr("fill", "#FF5722");
    }
}