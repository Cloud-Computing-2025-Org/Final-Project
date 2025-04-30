// Import visualization classes
import EngagementVisualization from './vis/engagement.js';
import DemographicsVisualization from './vis/demographics.js';
import SegmentationVisualization from './vis/segmentation.js';
import LoyaltyVisualization from './vis/loyalty.js';
import BasketAnalysisVisualization from './vis/basket.js';
import SeasonalTrendsVisualization from './vis/seasonal.js';
import BrandPreferenceVisualization from './vis/brand.js';
import CLVVisualization from './vis/clv.js';
import ChurnPredictionVisualization from './vis/churn.js';
import SocioeconomicVisualization from './vis/socioeconomic.js';
import RegionalPreferencesVisualization from './vis/regional.js';
import DemandForecastingVisualization from './vis/demand.js';

document.addEventListener("DOMContentLoaded", () => {
    const progressBar = document.getElementById("progress-bar");
    const loadingText = document.getElementById("loading-text");
    const eventSource = new EventSource("/dashboard_progress");
    
    const steps = [
        "Customer Engagement Over Time",
        "Impact of Demographic Factors",
        "Customer Segmentation",
        "Loyalty Program Impact",
        "Basket Analysis",
        "Seasonal and Temporal Trends",
        "Brand and Product Preference",
        "Customer Lifetime Value (CLV)",
        "Churn Prediction",
        "Socioeconomic Influence on Shopping",
        "Regional Preferences",
        "Demand Forecasting"
    ];
    
    const visualizationsContainer = document.getElementById("visualizations");
    visualizationsContainer.style.display = "none";
    
    // Map visualization IDs to their classes
    const visualizationClasses = {
        engagement: EngagementVisualization,
        demographics: DemographicsVisualization,
        segmentation: SegmentationVisualization,
        loyalty: LoyaltyVisualization,
        basket: BasketAnalysisVisualization,
        seasonal: SeasonalTrendsVisualization,
        brand: BrandPreferenceVisualization,
        clv: CLVVisualization,
        churn: ChurnPredictionVisualization,
        socioeconomic: SocioeconomicVisualization,
        regional: RegionalPreferencesVisualization,
        demand: DemandForecastingVisualization
    };

    eventSource.onmessage = (event) => {
        const progress = parseInt(event.data, 10);
        const stepIndex = Math.floor((progress / 90) * steps.length);
        loadingText.textContent = `Loading ${steps[stepIndex]}...`;
        progressBar.value = progress;
        
        if (progress >= 90) {
            eventSource.close();
            loadingText.textContent = `Pulling Data... (this is gonna take a good minute, dw it's cached after)`;
        }
    };

    fetch('/dashboard_data', { cache: 'force-cache' })
        .then(response => {
            progressBar.value = 95;
            loadingText.textContent = `Serializing Data...`;
            return response.json();
        })
        .then(data => {
            progressBar.value = 100;
            document.getElementById("loading").style.display = "none";
            visualizationsContainer.style.display = "grid";
            renderVisualizations(data);
        });

    function renderVisualizations(data) {
        const visualizationIds = Object.keys(visualizationClasses);
        
        visualizationIds.forEach((id) => {
            const visDiv = document.getElementById(id);
            if (visDiv) {
                const spinner = visDiv.querySelector(".vis-spinner");
                
                // Get container dimensions
                const containerWidth = visDiv.clientWidth; // remove padding
                
                // Create visualization instance
                const VisClass = visualizationClasses[id];
                const visualization = new VisClass(data[id], {
                    width: containerWidth,
                    height: 400,
                    container: `#${id}`
                });

                // Clean up
                spinner.remove();
            }
        });
    }
});