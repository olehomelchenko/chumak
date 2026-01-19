import vegaEmbed from 'vega-embed';
import { sytoTheme, bluesTheme } from './vega-themes';

/**
 * Syto Charts Engine
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
    container: string | HTMLElement,
    data: any[],
    column: string,
    theme: 'syto' | 'blues' = 'syto',
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
          },
          encoding: {},
        },
      ],
    };

    const vegaTheme = theme === 'syto' ? sytoTheme : bluesTheme;

    try {
      await vegaEmbed(container, spec, {
        actions: false,
        renderer: 'svg',
        config: vegaTheme,
      });
    } catch (error: any) {
      // Filter out non-critical errors about element IDs that don't affect rendering
      if (error?.message && error.message.includes('does not exist')) {
        // Silently ignore - charts render fine without these IDs
        return;
      }
      console.error('Error rendering boxplot:', error);
    }
  },

  /**
   * Render a 100% stacked horizontal bar chart for categorical data
   */
  async renderCategoricalBar(
    container: string | HTMLElement,
    aggregatedData: any[],
    theme: 'syto' | 'blues' = 'syto',
    options: ChartOptions = {}
  ): Promise<void> {
    if (!aggregatedData || aggregatedData.length === 0) return;

    // Map data with index, ensuring proper ordering: [Top values] - (others) - null - error
    // Order: regular values (0-9999), others (10000-19999), null (20000-29999), error (30000+)
    const chartData = aggregatedData.map((d, i) => ({
      ...d,
      index: d.isError ? 30000 + i : d.isNull ? 20000 + i : d.isOther ? 10000 + i : i,
    }));

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
              if (d.isError) return '#8B0000'; // Dark red for errors
              if (d.isNull) return '#666666'; // Darker grey for nulls
              if (d.isOther) return '#C8C8C8'; // Light grey for others
              // Mix of Syto and KSE colors that look good in both
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
    };

    const vegaTheme = theme === 'syto' ? sytoTheme : bluesTheme;

    try {
      await vegaEmbed(container, spec, {
        actions: false,
        renderer: 'svg',
        config: vegaTheme,
      });
    } catch (error: any) {
      // Filter out non-critical errors about element IDs that don't affect rendering
      if (error?.message && error.message.includes('does not exist')) {
        // Silently ignore - charts render fine without these IDs
        return;
      }
      console.error('Error rendering categorical bar:', error);
    }
  },

  /**
   * Render a histogram with brushing for numerical data
   */
  async renderHistogram(
    container: string | HTMLElement,
    data: any[],
    column: string,
    theme: 'syto' | 'blues' = 'syto',
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
          },
        },
      ],
    };

    const vegaTheme = theme === 'syto' ? sytoTheme : bluesTheme;

    try {
      const result = await vegaEmbed(container, spec, {
        actions: false,
        renderer: 'svg',
        config: vegaTheme,
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
    } catch (error: any) {
      // Filter out non-critical errors about element IDs that don't affect rendering
      if (error?.message && error.message.includes('does not exist')) {
        // Silently ignore - charts render fine without these IDs
        return;
      }
      console.error('Error rendering histogram:', error);
    }
  },

  /**
   * Render a temporal line chart for date/datetime columns
   */
  async renderTemporalChart(
    container: string | HTMLElement,
    data: any[],
    column: string,
    theme: 'syto' | 'blues' = 'syto',
    options: ChartOptions = {}
  ): Promise<void> {
    if (!data || data.length === 0 || !column) return;

    // Filter valid dates and sort by date
    const chartData = data
      .map((row) => ({ [column]: row[column] }))
      .filter((row) => {
        const val = row[column];
        if (val === null || val === undefined || val === '') return false;
        const date = new Date(val);
        return !isNaN(date.getTime());
      })
      .sort((a, b) => new Date(a[column]).getTime() - new Date(b[column]).getTime());

    if (chartData.length === 0) return;

    // Aggregate by time unit based on date range
    const firstDate = new Date(chartData[0][column]);
    const lastDate = new Date(chartData[chartData.length - 1][column]);
    const rangeDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

    let timeUnit: string;
    if (rangeDays > 365 * 2) {
      timeUnit = 'yearmonth';
    } else if (rangeDays > 60) {
      timeUnit = 'yearmonthdate';
    } else if (rangeDays > 2) {
      timeUnit = 'monthdate';
    } else {
      timeUnit = 'hoursminutes';
    }

    const spec: any = {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      data: { values: chartData },
      width: options.width || 'container',
      height: options.height || 80,
      padding: { top: 10, bottom: 25, left: 10, right: 10 },
      mark: {
        type: 'area',
        line: true,
        point: false,
        opacity: 0.3,
        tooltip: true,
      },
      encoding: {
        x: {
          field: column,
          type: 'temporal',
          timeUnit: timeUnit,
          title: '',
          axis: { grid: false, labels: true, ticks: true, format: '%b %Y' },
        },
        y: {
          aggregate: 'count',
          type: 'quantitative',
          axis: null,
        },
        tooltip: [
          { field: column, type: 'temporal', timeUnit: timeUnit, title: 'Date' },
          { aggregate: 'count', title: 'Count' },
        ],
      },
    };

    const vegaTheme = theme === 'syto' ? sytoTheme : bluesTheme;

    try {
      await vegaEmbed(container, spec, {
        actions: false,
        renderer: 'svg',
        config: vegaTheme,
      });
    } catch (error: any) {
      // Filter out non-critical errors about element IDs that don't affect rendering
      if (error?.message && error.message.includes('does not exist')) {
        // Silently ignore - charts render fine without these IDs
        return;
      }
      console.error('Error rendering temporal chart:', error);
    }
  },
};
