// Import D3.js directly in your worker file
importScripts('https://d3js.org/d3.v7.min.js');

self.onmessage = function(event) {
  const { id, data } = event.data;
  let progress = 0;

  // dummy loading
  const interval = setInterval(() => {
    if (progress === 100) {
      clearInterval(interval);
    }

    progress += 10;
    self.postMessage({ progress });
  }, 300);

  let svgContent = '';
  switch (id) {
    case 'engagement':
      svgContent = (new EngagementVisualization(data)).generateSVG();
      break;
    case 'demographics':
      svgContent = (new DemographicsVisualization(data)).generateSVG();
      break;
    case 'segmentation':
      svgContent = (new SegmentationVisualization(data)).generateSVG();
        break;
    case 'loyalty':
      svgContent = (new LoyaltyVisualization(data)).generateSVG();
        break;
    default:
      svgContent = '<svg><text x="10" y="20">Unknown Visualization</text></svg>';
  }
  progress = 100;
  self.postMessage({ progress: progress, svgContent });
};

// Base class modifications
class BaseVisualization {
    constructor(width = 600, height = 400, margin = { top: 20, right: 30, bottom: 30, left: 60 }) {
        this.width = width;
        this.height = height;
        this.margin = margin;
        this.svgWidth = width + margin.left + margin.right;
        this.svgHeight = height + margin.top + margin.bottom;
        this.innerWidth = width - margin.left - margin.right;
        this.innerHeight = height - margin.top - margin.bottom;
        // Initialize D3 scales
        this.xScale = null;
        this.yScale = null;
    }

    generateSVG() {
        return `<svg width="${this.svgWidth}" height="${this.svgHeight}">
                <g transform="translate(${this.margin.left},${this.margin.top})">`;
    }

    addAxes(xAxis, yAxis) {
        const axes = `
            <g transform="translate(0,${this.innerHeight})">
                ${d3.axisBottom(xAxis)}
            </g>
            <g transform="translate(-25,0)">
                ${d3.axisLeft(yAxis)}
            </g>`;
        return axes;
    }

    addLegend(items, x, y) {
        const legendItems = items.map((item, i) => `
            <rect x="${x}" y="${y + i * 25}" width="15" height="15" fill="${item.color}"/>
            <text x="${x + 20}" y="${y + i * 25 + 13}" font-size="12">${item.label}</text>
        `).join('');
        return legendItems;
    }
}

class EngagementVisualization extends BaseVisualization {
    constructor(data) {
        super(data.width);
        this.data = data;
        // Initialize scales
        this.xScale = d3.scaleTime()
            .range([0, this.innerWidth]);
            
        this.yScaleSpend = d3.scaleLinear()
            .range([this.innerHeight, 0]);
            
        this.yScaleHouseholds = d3.scaleLinear()
            .range([this.innerHeight, 0]);
    }

    generateSVG() {
        const data = this.data
        // Set domains
        this.xScale.domain(d3.extent(data, d => new Date(d.YEAR, d.WEEK_NUM)));
        this.yScaleSpend.domain([0, d3.max(data, d => d.total_spend)]);
        this.yScaleHouseholds.domain([0, d3.max(data, d => d.unique_households)]);

        // Create SVG string
        let svgString = super.generateSVG();

        // Add axes
        svgString += this.addAxes(
            d3.axisBottom(this.xScale),
            d3.axisLeft(this.yScaleSpend)
        );

        // Add lines
        const lineGenSpend = d3.line()
            .x(d => this.xScale(new Date(d.YEAR, d.WEEK_NUM)))
            .y(d => this.yScaleSpend(d.total_spend));

        const lineGenHouseholds = d3.line()
            .x(d => this.xScale(new Date(d.YEAR, d.WEEK_NUM)))
            .y(d => this.yScaleHouseholds(d.unique_households));

        svgString += `
            <path class="line spend-line"
                d="${lineGenSpend(data)}"
                fill="none"
                stroke="#ff7f0e"
                stroke-width="2"/>
            <path class="line household-line"
                d="${lineGenHouseholds(data)}"
                fill="none"
                stroke="#1f77b4"
                stroke-width="2"/>
        `;

        // Add legend
        svgString += this.addLegend(
            [
                { color: "#ff7f0e", label: "Total Spend" },
                { color: "#1f77b4", label: "Unique Households" }
            ],
            this.innerWidth - 120,
            20
        );

        // Close SVG
        svgString += '</g></svg>';

        return svgString;
    }

    exportSVG(data) {
        const svgString = this.generateSVG(data);
        
        // Create blob and download
        const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = "engagement-visualization.svg";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
}

class DemographicsVisualization extends BaseVisualization {
    constructor(data) {
        super(data.width);
        this.data = data;
    }

    generateSVG() {
        // Process data
        const processedData = this.data.reduce((acc, item) => {
            const ageGroup = item.AGE_RANGE.trim();
            acc[ageGroup] = acc[ageGroup] || { ageGroup, values: [] };
            acc[ageGroup].values.push({
                loyalty: item.L === 'Y',
                spend: parseFloat(item.avg_spend)
            });
            return acc;
        }, {});

        const seriesData = Object.entries(processedData).map(([ageGroup, data]) => ({
            ageGroup,
            avgSpend: d3.mean(data.values, d => d.spend),
            loyaltyRate: (data.values.filter(d => d.loyalty).length / data.values.length) * 100
        }));

        // Create scales
        const xScale = d3.scaleBand()
            .domain(seriesData.map(d => d.ageGroup))
            .range([0, this.innerWidth])
            .padding(0.3);

        // Adjust y-scale domain to account for both metrics
        const maxDomainValue = d3.max(seriesData, d => Math.max(d.avgSpend, d.loyaltyRate));
        const yScale = d3.scaleLinear()
            .domain([0, maxDomainValue * 1.1]) // Add 10% padding
            .range([this.innerHeight, 0]);

        // Generate SVG content
        let svgContent = super.generateSVG();

        // Add spend bars
        svgContent += seriesData.map((d, i) => {
            return `<rect x="${xScale(d.ageGroup)}" y="${yScale(d.avgSpend)}"
                    width="${xScale.bandwidth()}" height="${this.innerHeight - yScale(d.avgSpend)}"
                    fill="#2196F3"/>`;
        }).join('');

        // Add loyalty rate bars with proper positioning
        svgContent += seriesData.map((d, i) => {
            const barWidth = xScale.bandwidth() / 2;
            const offset = barWidth + (barWidth / 2);
            return `<rect x="${xScale(d.ageGroup) + offset}" y="${yScale(d.loyaltyRate)}"
                    width="${barWidth}" height="${this.innerHeight - yScale(d.loyaltyRate)}"
                    fill="#FF5722"/>`;
        }).join('');

        // Add axes// Add axes with labels
        svgContent += this.addAxes(
            d3.axisBottom(xScale),
            d3.axisLeft(yScale)
        );

        // Add axis labels
        svgContent += `
            <!-- X-axis label -->
            <text
                transform="translate(${this.innerWidth/2},${this.innerHeight + 25})"
                style="text-anchor: middle;"
                class="axis-label"
            >
                Age Group
            </text>
            
            <!-- Y-axis label -->
            <text
                transform="rotate(-90)"
                transform-origin="${this.innerHeight/2}px ${this.margin.left - 10}px"
                style="text-anchor: middle;"
                class="axis-label"
            >
                Average Spend/Loyalty Rate (%)
            </text>
        `;
        // Add legend
        svgContent += this.addLegend([
            { color: '#2196F3', label: 'Average Spend' },
            { color: '#FF5722', label: 'Loyalty Rate' }
        ], this.innerWidth - 150, 30);

        // Close SVG
        svgContent += '</g></svg>';
        return svgContent;
    }
}

class SegmentationVisualization extends BaseVisualization {
  constructor(data) {
      super(data.width);
      this.data = data;
  }

  generateSVG() {
      // Process data for clustering
      const points = this.data.map(d => ({
          x: parseFloat(d.total_spend),
          y: parseInt(d.HSHD_NUM),
          ageRange: d.AGE_RANGE.trim(),
          loyalty: d.L === 'Y'
      }));

      // Perform k-means clustering
      const clusters = kMeans(points, 3);

      // Create scales
      const xScale = d3.scaleLinear()
          .domain([0, d3.max(clusters, c => d3.max(c.points, d => d.x))])
          .range([0, this.innerWidth]);

      const yScale = d3.scaleLinear()
          .domain([0, d3.max(clusters, c => d3.max(c.points, d => d.y))])
          .range([this.innerHeight, 0]);

      // Generate SVG content
      let svgContent = super.generateSVG();

      // Add points
      clusters.forEach((cluster, i) => {
          svgContent += cluster.points.map(point => `
              <circle cx="${xScale(point.x)}" cy="${yScale(point.y)}" r="5"
                      fill="${['#FF5722', '#2196F3', '#009688'][i]}"
                      opacity="0.7">
                  <title>Age Range: ${point.ageRange}<br>Loyalty: ${point.loyalty ? 'Yes' : 'No'}</title>
              </circle>
          `).join('');
      });

      // Add centroids
      svgContent += clusters.map((cluster, i) => `
          <circle cx="${xScale(cluster.centroid.x)}" cy="${yScale(cluster.centroid.y)}"
                  r="8" fill="${['#FF5722', '#2196F3', '#009688'][i]}"
                  stroke="white" stroke-width="2">
              <title>Cluster ${i+1} Centroid</title>
          </circle>
      `).join('');

      // Add axes
      svgContent += this.addAxes(
          d3.axisBottom(xScale),
          d3.axisLeft(yScale)
      );

      // Add legend
      svgContent += this.addLegend(clusters.map((_, i) => ({
          color: ['#FF5722', '#2196F3', '#009688'][i],
          label: `Cluster ${i + 1}`
      })), this.innerWidth - 150, 30);

      // Close SVG
      svgContent += '</g></svg>';
      return svgContent;
  }
}

class LoyaltyVisualization extends BaseVisualization {
  constructor(data) {
      super(data.width);
      this.data = data;
  }

  generateSVG() {
      // Process data
      const processedData = this.data.reduce((acc, item) => {
          acc[item.L === 'Y' ? 'Loyal' : 'Non-Loyal'].push(item);
          return acc;
      }, { 'Loyal': [], 'Non-Loyal': [] });

      const loyalStats = calculateStatistics(processedData['Loyal']);
      const nonLoyalStats = calculateStatistics(processedData['Non-Loyal']);

      // Create scales
      const xScale = d3.scaleBand()
          .domain(['Loyal', 'Non-Loyal'])
          .range([0, this.innerWidth])
          .padding(0.3);

      const yScale = d3.scaleLinear()
          .domain([0, Math.max(loyalStats.max, nonLoyalStats.max)])
          .range([this.innerHeight, 0]);

      // Generate SVG content
      let svgContent = super.generateSVG();

      // Add box plots
      ['Loyal', 'Non-Loyal'].forEach(group => {
          const stats = group === 'Loyal' ? loyalStats : nonLoyalStats;
          svgContent += createBoxPlot(stats, 
              xScale(group),
              yScale,
              group);
      });

      // Add axes
      svgContent += this.addAxes(
          d3.axisBottom(xScale),
          d3.axisLeft(yScale)
      );

      // Add legend
      svgContent += this.addLegend([
          { color: '#2196F3', label: 'Loyal Customers' },
          { color: '#FF5722', label: 'Non-Loyal Customers' }
      ], this.innerWidth - 150, 30);

      // Close SVG
      svgContent += '</g></svg>';
      return svgContent;
  }
}

// Helper functions remain unchanged
function kMeans(points, k) {
  let centroids = Array.from({length: k}, () => ({
      x: points[Math.floor(Math.random() * points.length)].x,
      y: points[Math.floor(Math.random() * points.length)].y
  }));
  
  let clusters = Array.from({length: k}, () => ({points: [], centroid: centroids[k-1]}));
  let converged = false;
  
  while (!converged) {
      clusters.forEach(cluster => cluster.points = []);
      points.forEach(point => {
          const distances = centroids.map(c =>
              Math.sqrt(Math.pow(point.x - c.x, 2) + Math.pow(point.y - c.y, 2))
          );
          const closestCluster = distances.indexOf(Math.min(...distances));
          clusters[closestCluster].points.push(point);
      });
      
      const newCentroids = clusters.map(cluster => ({
          x: d3.mean(cluster.points, d => d.x),
          y: d3.mean(cluster.points, d => d.y)
      }));
      
      converged = centroids.every((c, i) =>
          c.x === newCentroids[i].x && c.y === newCentroids[i].y
      );
      centroids = newCentroids;
  }
  
  return clusters.map(cluster => ({
      points: cluster.points,
      centroid: centroids[clusters.indexOf(cluster)]
  }));
}

function calculateStatistics(data) {
  const values = data.map(d => parseFloat(d.avg_spend));
  const sorted = values.sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const median = sorted[Math.floor(sorted.length * 0.5)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  
  return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      q1,
      median,
      q3,
      mean: d3.mean(values),
      count: values.length
  };
}

function createBoxPlot(stats, x, yScale, label) {
  const boxWidth = 60;

  // Box
  const boxContent = `
      <!-- Box -->
      <rect x="${x - boxWidth/2}" y="${yScale(stats.q3)}"
            width="${boxWidth}" height="${yScale(stats.q1) - yScale(stats.q3)}"
            fill="none" stroke="#2196F3"/>
      <!-- Median line -->
      <line x1="${x - boxWidth/2}" x2="${x + boxWidth/2}"
            y1="${yScale(stats.median)}" y2="${yScale(stats.median)}"
            stroke="#2196F3"/>
      <!-- Whiskers -->
      <line x1="${x}" x2="${x}" y1="${yScale(stats.min)}" y2="${yScale(stats.q1)}"
            stroke="#2196F3"/>
      <line x1="${x}" x2="${x}" y1="${yScale(stats.q3)}" y2="${yScale(stats.max)}"
            stroke="#2196F3"/>
      <!-- Mean point -->
      <circle cx="${x}" cy="${yScale(stats.mean)}" r="5" fill="#FF5722"/>
      <!-- Label -->
      <text x="${x}" y="${this.innerHeight + 20}" text-anchor="middle">
          ${label}
      </text>
  `;

  return boxContent;
}

// Add more visualization functions here...