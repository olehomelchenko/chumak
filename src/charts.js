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
      .map((row) => ({ [column]: row[column] }))
      .filter((row) => row[column] !== null && row[column] !== undefined && row[column] !== '');

    const spec = {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      data: { values: chartData },
      width: options.width || 'container',
      height: options.height || 60,
      padding: { top: 10, bottom: 20, left: 10, right: 10 },
      encoding: {
        x: {
          field: column,
          type: 'quantitative',
          title: '',
          scale: { zero: false },
          axis: { ticks: false, grid: false, labels: true },
        },
      },
      layer: [
        {
          transform: [{ sample: 1000 }, { calculate: 'random()', as: 'jitter' }],
          mark: {
            type: 'circle',
            tooltip: true,
            color: 'gray',
            opacity: 0.2,
            size: 15,
          },
          encoding: {
            y: {
              field: 'jitter',
              type: 'quantitative',
              axis: null,
              scale: { domain: [-0.1, 1.1] },
            },
          },
        },
        {
          mark: {
            type: 'boxplot',
            extent: 1.5,
            ticks: false,
            size: 30,
            color: '#00BBCE', // Brand Cyan
          },
          encoding: {},
        },
      ],
      config: {
        view: { stroke: 'transparent' },
        axis: {
          labelFontSize: 10,
          labelColor: '#646464',
        },
      },
    };

    try {
      await vegaEmbed(containerSelector, spec, {
        actions: false,
        renderer: 'svg',
      });
    } catch (error) {
      console.error('Error rendering boxplot:', error);
    }
  },

  /**
   * Render a 100% stacked horizontal bar chart for categorical data
   * @param {string} containerSelector - CSS selector for the container
   * @param {Array<Object>} aggregatedData - Top frequencies including 'Other'
   * @param {Object} options - Customization options
   */
  async renderCategoricalBar(containerSelector, aggregatedData, options = {}) {
    if (!aggregatedData || aggregatedData.length === 0) return;

    // Add index for consistent stacking order (first in data = first in bar)
    const chartData = aggregatedData.map((d, i) => ({ ...d, index: i }));

    const spec = {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      data: { values: chartData },
      width: options.width || 'container',
      height: options.height || 40,
      padding: { top: 5, bottom: 5, left: 10, right: 10 },
      mark: { type: 'bar', tooltip: true },
      encoding: {
        x: {
          field: 'count',
          type: 'quantitative',
          stack: 'normalize',
          axis: null,
        },
        color: {
          field: 'value',
          type: 'nominal',
          scale: {
            // Dynamically map values to colors, ensuring "Other" is gray
            domain: aggregatedData.map((d) => d.value),
            range: aggregatedData.map((d, i) => {
              if (d.isOther) return '#C8C8C8'; // Gray for Other
              const colors = ['#003964', '#00BBCE', '#A7C539', '#E4E541', '#F15B43'];
              return colors[i] || '#C8C8C8';
            }),
          },
          legend: null,
        },
        order: {
          field: 'index',
          type: 'quantitative',
        },
        tooltip: [
          { field: 'value', title: 'Value' },
          { field: 'count', title: 'Count' },
          { field: 'percentage', title: 'Percentage', format: '.1f' },
        ],
      },
      config: {
        view: { stroke: 'transparent' },
      },
    };

    try {
      await vegaEmbed(containerSelector, spec, {
        actions: false,
        renderer: 'svg',
      });
    } catch (error) {
      console.error('Error rendering categorical bar:', error);
    }
  },

  /**
   * Render a histogram with brushing for numerical data
   * @param {string} containerSelector - CSS selector for the container
   * @param {Array<Object>} data - Array of row objects
   * @param {string} column - Column name
   * @param {Function} onBrush - Callback function when selection changes
   * @param {Object} options - Customization options
   */
  async renderHistogram(containerSelector, data, column, onBrush, options = {}) {
    if (!data || data.length === 0 || !column) return;

    // Prepare data: filter out nulls
    const chartData = data
      .map((row) => ({ [column]: row[column] }))
      .filter((row) => row[column] !== null && row[column] !== undefined && row[column] !== '');

    const spec = {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      data: { values: chartData },
      width: options.width || 'container',
      height: options.height || 80,
      padding: { top: 10, bottom: 25, left: 10, right: 10 },
      encoding: {
        x: {
          field: column,
          type: 'quantitative',
          bin: { maxbins: options.maxbins || 40 },
          title: '',
          axis: { grid: false, labels: true, ticks: true },
        },
        y: {
          aggregate: 'count',
          type: 'quantitative',
          axis: null,
        },
      },
      layer: [
        {
          params: [
            {
              name: 'brush',
              select: {
                type: 'interval',
                encodings: ['x'],
              },
            },
          ],
          mark: {
            type: 'bar',
            color: '#eeeeee',
            tooltip: true,
          },
        },
        {
          transform: [{ filter: { param: 'brush' } }],
          mark: {
            type: 'bar',
            color: '#00BBCE', // Brand Cyan
          },
        },
      ],
      config: {
        view: { stroke: 'transparent' },
        axis: {
          labelFontSize: 10,
          labelColor: '#646464',
        },
      },
    };

    try {
      const result = await vegaEmbed(containerSelector, spec, {
        actions: false,
        renderer: 'svg',
      });

      // Listen to selection changes
      if (onBrush) {
        result.view.addSignalListener('brush', (name, value) => {
          if (value && value[column]) {
            onBrush({
              min: value[column][0],
              max: value[column][1],
            });
          } else {
            onBrush(null);
          }
        });
      }
    } catch (error) {
      console.error('Error rendering histogram:', error);
    }
  },
};

// Export for use in app
window.ChartsEngine = ChartsEngine;
