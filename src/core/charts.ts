import vegaEmbed from 'vega-embed';

/**
 * Chumak Charts Engine
 *
 * Provides visualization capabilities using Vega-Lite.
 */

export interface ChartOptions {
  width?: number | 'container';
  height?: number;
  maxbins?: number;
}

export const ChartsEngine = {
  /**
   * Render a boxplot for a specific column
   */
  async renderBoxPlot(
    containerSelector: string,
    data: any[],
    column: string,
    options: ChartOptions = {}
  ): Promise<void> {
    if (!data || data.length === 0 || !column) return;

    const chartData = data
      .map((row) => ({ [column]: row[column] }))
      .filter((row) => row[column] !== null && row[column] !== undefined && row[column] !== '');

    const spec: any = {
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
            color: '#1789fc',
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
   */
  async renderCategoricalBar(
    containerSelector: string,
    aggregatedData: any[],
    options: ChartOptions = {}
  ): Promise<void> {
    if (!aggregatedData || aggregatedData.length === 0) return;

    const chartData = aggregatedData.map((d, i) => ({ ...d, index: i }));

    const spec: any = {
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
            domain: aggregatedData.map((d) => d.value),
            range: aggregatedData.map((d, i) => {
              if (d.isOther) return '#C8C8C8';
              // Mix of Chumak and KSE colors that look good in both
              const colors = ['#1789fc', '#fdb833', '#a7c539', '#00bbce', '#f15b43'];
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
   */
  async renderHistogram(
    containerSelector: string,
    data: any[],
    column: string,
    onBrush?: (selection: { min: number; max: number } | null) => void,
    options: ChartOptions = {}
  ): Promise<void> {
    if (!data || data.length === 0 || !column) return;

    const chartData = data
      .map((row) => ({ [column]: row[column] }))
      .filter((row) => row[column] !== null && row[column] !== undefined && row[column] !== '');

    const spec: any = {
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
            color: '#1789fc',
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

      if (onBrush) {
        result.view.addSignalListener('brush', (_name: string, value: any) => {
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
