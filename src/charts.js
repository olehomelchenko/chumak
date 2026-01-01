/**
 * Chumak Charts Engine
 * 
 * Provides visualization capabilities using Vega-Lite.
 */

const ChartsEngine = {
    /**
     * Render a boxplot for a specific column
     * @param {string} containerSelector - CSS selector for the container
     * @param {Array<Object>} data - Array of row objects
     * @param {string} column - Column name
     * @param {Object} options - Customization options
     */
    async renderBoxPlot(containerSelector, data, column, options = {}) {
        if (!data || data.length === 0 || !column) return;

        // Prepare data: filter out nulls and take only the needed column to minimize memory/transfer
        const chartData = data
            .map(row => ({ [column]: row[column] }))
            .filter(row => row[column] !== null && row[column] !== undefined && row[column] !== '');

        const spec = {
            "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
            "data": { "values": chartData },
            "width": options.width || "container",
            "height": options.height || 60,
            "padding": { "top": 10, "bottom": 20, "left": 10, "right": 10 },
            "encoding": {
                "x": {
                    "field": column,
                    "type": "quantitative",
                    "title": "",
                    "scale": { "zero": false },
                    "axis": { "ticks": false, "grid": false, "labels": true }
                }
            },
            "layer": [
                {
                    "transform": [{ "calculate": "random()", "as": "jitter" }],
                    "mark": {
                        "type": "point",
                        "tooltip": true,
                        "color": "gray",
                        "opacity": 0.2,
                        "size": 15
                    },
                    "encoding": {
                        "y": {
                            "field": "jitter",
                            "type": "quantitative",
                            "axis": null,
                            "scale": { "domain": [-0.1, 1.1] }
                        }
                    }
                },
                {
                    "mark": {
                        "type": "boxplot",
                        "extent": 1.5,
                        "ticks": false,
                        "size": 30,
                        "color": "#00BBCE" // Brand Cyan
                    },
                    "encoding": {}
                }
            ],
            "config": {
                "view": { "stroke": "transparent" },
                "axis": {
                    "labelFontSize": 10,
                    "labelColor": "#646464"
                }
            }
        };

        try {
            await vegaEmbed(containerSelector, spec, {
                actions: false,
                renderer: 'svg'
            });
        } catch (error) {
            console.error('Error rendering boxplot:', error);
        }
    }
};

// Export for use in app
window.ChartsEngine = ChartsEngine;
