import vegaEmbed from 'vega-embed';
import { sytoTheme, bluesTheme } from './vega-themes';
import { isConversionError } from './type-converter';
import type { BivariateSuggestion } from './bivariate';

/**
 * Syto Charts Engine
 *
 * Provides visualization capabilities using Vega-Lite.
 */

// TODO: Tooltip titles across all chart methods are hardcoded English.
// To i18n them, accept translated labels from callers (core/ must stay portable, no i18n imports).

/** Escape dots and brackets so Vega-Lite treats them as literal field names */
function escapeVegaField(name: string): string {
  return name.replace(/([.\[\]])/g, '\\$1');
}

export interface BoxPlotStats {
  min: number;
  max: number;
  p25: number;
  median: number;
  p75: number;
}

export interface ChartOptions {
  width?: number | 'container';
  height?: number;
  maxbins?: number;
  /** Render as a compact thumbnail (no axes labels, no tooltip, smaller) */
  thumbnail?: boolean;
}

export const ChartsEngine = {
  /**
   * Render a boxplot for a specific column using pre-aggregated stats.
   * Jitter scatter uses a sampled subset; the box/whiskers are drawn from summary statistics.
   */
  async renderBoxPlot(
    container: string | HTMLElement,
    sampleData: any[],
    column: string,
    stats: BoxPlotStats,
    theme: 'syto' | 'blues' = 'syto',
    options: ChartOptions = {}
  ): Promise<void> {
    if (!column) return;

    const escaped = escapeVegaField(column);
    const { min, max, p25, median, p75 } = stats;

    // IQR-based whisker bounds (1.5× IQR), clamped to actual data range
    const iqr = p75 - p25;
    const whiskerLow = Math.max(min, p25 - 1.5 * iqr);
    const whiskerHigh = Math.min(max, p75 + 1.5 * iqr);

    // Sample data for jitter scatter (already filtered by caller)
    const jitterData = sampleData.map((row) => ({ [column]: row[column] }));

    // Pre-aggregated summary for box/whisker layers (yMid centers in jitter space)
    const summaryData = [{ whiskerLow, p25, median, p75, whiskerHigh, yMid: 0.5 }];

    const spec: any = {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      width: options.width || 'container',
      height: options.height || 60,
      padding: { top: 10, bottom: 20, left: 10, right: 10 },
      encoding: {
        x: {
          type: 'quantitative',
          title: '',
          scale: { zero: false },
          axis: { ticks: false, grid: false, labels: true },
        },
      },
      layer: [
        // Jitter scatter (sampled points)
        {
          data: { values: jitterData },
          transform: [{ calculate: 'random()', as: 'jitter' }],
          mark: {
            type: 'circle',
            tooltip: true,
            color: 'gray',
            opacity: 0.2,
            size: 15,
          },
          encoding: {
            x: { field: escaped },
            y: {
              field: 'jitter',
              type: 'quantitative',
              axis: null,
              scale: { domain: [-0.1, 1.1] },
            },
          },
        },
        // Whisker line (low to high)
        {
          data: { values: summaryData },
          mark: { type: 'rule', size: 1 },
          encoding: {
            x: { field: 'whiskerLow' },
            x2: { field: 'whiskerHigh' },
            y: { field: 'yMid', type: 'quantitative', axis: null, scale: { domain: [-0.1, 1.1] } },
            tooltip: [
              { field: 'whiskerLow', type: 'quantitative', title: 'Lower whisker' },
              { field: 'whiskerHigh', type: 'quantitative', title: 'Upper whisker' },
            ],
          },
        },
        // IQR box
        {
          data: { values: summaryData },
          mark: { type: 'bar', size: 20 },
          encoding: {
            x: { field: 'p25' },
            x2: { field: 'p75' },
            y: { field: 'yMid', type: 'quantitative', axis: null, scale: { domain: [-0.1, 1.1] } },
            tooltip: [
              { field: 'p25', type: 'quantitative', title: 'Q1 (25%)' },
              { field: 'median', type: 'quantitative', title: 'Median' },
              { field: 'p75', type: 'quantitative', title: 'Q3 (75%)' },
            ],
          },
        },
        // Median tick
        {
          data: { values: summaryData },
          mark: { type: 'tick', size: 20, thickness: 2, color: 'white' },
          encoding: {
            x: { field: 'median' },
            y: { field: 'yMid', type: 'quantitative', axis: null, scale: { domain: [-0.1, 1.1] } },
            tooltip: [{ field: 'median', type: 'quantitative', title: 'Median' }],
          },
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
    onValueClick?: (
      item: {
        value: any;
        isNull?: boolean;
        isOther?: boolean;
        isError?: boolean;
      },
      event: MouseEvent
    ) => void,
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
      mark: { type: 'bar', tooltip: true, cursor: onValueClick ? 'pointer' : undefined },
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
      const result = await vegaEmbed(container, spec, {
        actions: false,
        renderer: 'svg',
        config: vegaTheme,
      });

      if (onValueClick) {
        result.view.addEventListener('click', (event: any, item: any) => {
          if (item?.datum?.value !== undefined) {
            onValueClick(
              {
                value: item.datum.value,
                isNull: item.datum.isNull,
                isOther: item.datum.isOther,
                isError: item.datum.isError,
              },
              event
            );
          }
        });
      }
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
      .filter(
        (row) =>
          row[column] !== null &&
          row[column] !== undefined &&
          row[column] !== '' &&
          !isConversionError(row[column])
      );

    const spec: any = {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      data: { values: chartData },
      width: options.width || 'container',
      height: options.height || 80,
      padding: { top: 10, bottom: 25, left: 10, right: 10 },
      encoding: {
        x: {
          field: escapeVegaField(column),
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
        const escaped = escapeVegaField(column);
        result.view.addSignalListener('brush', (_name: string, value: any) => {
          if (value && value[escaped]) {
            onBrush({
              min: value[escaped][0],
              max: value[escaped][1],
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
        if (val === null || val === undefined || val === '' || isConversionError(val)) return false;
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
          field: escapeVegaField(column),
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
          { field: escapeVegaField(column), type: 'temporal', timeUnit: timeUnit, title: 'Date' },
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

  /**
   * Render a scatter plot for two numeric columns
   */
  async renderScatterPlot(
    container: string | HTMLElement,
    data: any[],
    colX: string,
    colY: string,
    theme: 'syto' | 'blues' = 'syto',
    options: ChartOptions = {}
  ): Promise<void> {
    if (!data || data.length === 0 || !colX || !colY) return;

    const thumb = options.thumbnail;
    const escapedX = escapeVegaField(colX);
    const escapedY = escapeVegaField(colY);

    const spec: any = {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      data: { values: data.map((r) => ({ [colX]: r[colX], [colY]: r[colY] })) },
      width: options.width || 'container',
      height: options.height || (thumb ? 50 : 250),
      padding: thumb ? 2 : { top: 10, bottom: 25, left: 40, right: 10 },
      mark: {
        type: 'circle',
        opacity: 0.5,
        size: thumb ? 8 : 20,
        tooltip: !thumb,
      },
      encoding: {
        x: {
          field: escapedX,
          type: 'quantitative',
          title: thumb ? '' : colX,
          scale: { zero: false },
          axis: thumb ? null : { grid: false },
        },
        y: {
          field: escapedY,
          type: 'quantitative',
          title: thumb ? '' : colY,
          scale: { zero: false },
          axis: thumb ? null : { grid: false },
        },
        ...(thumb
          ? {}
          : {
              tooltip: [
                { field: escapedX, type: 'quantitative', title: colX },
                { field: escapedY, type: 'quantitative', title: colY },
              ],
            }),
      },
    };

    await this._embed(container, spec, theme);
  },

  /**
   * Render a grouped bar chart (mean of numeric by category, or count by category)
   */
  async renderGroupedBar(
    container: string | HTMLElement,
    data: any[],
    numericCol: string,
    categoryCol: string,
    theme: 'syto' | 'blues' = 'syto',
    options: ChartOptions = {}
  ): Promise<void> {
    if (!data || data.length === 0 || !numericCol || !categoryCol) return;

    const thumb = options.thumbnail;
    const escapedNum = escapeVegaField(numericCol);
    const escapedCat = escapeVegaField(categoryCol);

    const spec: any = {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      data: {
        values: data.map((r) => ({ [numericCol]: r[numericCol], [categoryCol]: r[categoryCol] })),
      },
      width: options.width || 'container',
      height: options.height || (thumb ? 50 : 250),
      padding: thumb ? 2 : { top: 10, bottom: 25, left: 40, right: 10 },
      mark: { type: 'bar', tooltip: !thumb },
      encoding: {
        x: {
          field: escapedCat,
          type: 'nominal',
          title: thumb ? '' : categoryCol,
          axis: thumb ? null : { labelAngle: -45 },
          sort: '-y',
        },
        y: {
          field: escapedNum,
          aggregate: 'mean',
          type: 'quantitative',
          title: thumb ? '' : `mean(${numericCol})`,
          axis: thumb ? null : { grid: false },
        },
        ...(thumb
          ? {}
          : {
              tooltip: [
                { field: escapedCat, type: 'nominal', title: categoryCol },
                {
                  field: escapedNum,
                  aggregate: 'mean',
                  type: 'quantitative',
                  title: `mean(${numericCol})`,
                  format: '.2f',
                },
                { field: escapedNum, aggregate: 'count', type: 'quantitative', title: 'Count' },
              ],
            }),
      },
    };

    await this._embed(container, spec, theme);
  },

  /**
   * Render a line chart for a numeric column over time
   */
  async renderLineOverTime(
    container: string | HTMLElement,
    data: any[],
    numericCol: string,
    dateCol: string,
    theme: 'syto' | 'blues' = 'syto',
    options: ChartOptions = {}
  ): Promise<void> {
    if (!data || data.length === 0 || !numericCol || !dateCol) return;

    const thumb = options.thumbnail;
    const escapedNum = escapeVegaField(numericCol);
    const escapedDate = escapeVegaField(dateCol);

    // Determine time unit based on date range
    const validDates = data
      .map((r) => new Date(r[dateCol]))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (validDates.length < 2) return;

    const rangeDays =
      (validDates[validDates.length - 1].getTime() - validDates[0].getTime()) /
      (1000 * 60 * 60 * 24);
    const timeUnit =
      rangeDays > 365 * 2 ? 'yearmonth' : rangeDays > 60 ? 'yearmonthdate' : 'monthdate';

    const spec: any = {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      data: { values: data.map((r) => ({ [numericCol]: r[numericCol], [dateCol]: r[dateCol] })) },
      width: options.width || 'container',
      height: options.height || (thumb ? 50 : 250),
      padding: thumb ? 2 : { top: 10, bottom: 25, left: 40, right: 10 },
      mark: { type: 'line', point: !thumb, tooltip: !thumb },
      encoding: {
        x: {
          field: escapedDate,
          type: 'temporal',
          timeUnit,
          title: thumb ? '' : dateCol,
          axis: thumb ? null : { grid: false },
        },
        y: {
          field: escapedNum,
          aggregate: 'mean',
          type: 'quantitative',
          title: thumb ? '' : `mean(${numericCol})`,
          axis: thumb ? null : { grid: false },
        },
        ...(thumb
          ? {}
          : {
              tooltip: [
                { field: escapedDate, type: 'temporal', timeUnit, title: dateCol },
                {
                  field: escapedNum,
                  aggregate: 'mean',
                  type: 'quantitative',
                  title: `mean(${numericCol})`,
                  format: '.2f',
                },
              ],
            }),
      },
    };

    await this._embed(container, spec, theme);
  },

  /**
   * Render a heatmap for two categorical columns
   */
  async renderHeatmap(
    container: string | HTMLElement,
    data: any[],
    col1: string,
    col2: string,
    theme: 'syto' | 'blues' = 'syto',
    options: ChartOptions = {}
  ): Promise<void> {
    if (!data || data.length === 0 || !col1 || !col2) return;

    const thumb = options.thumbnail;
    const escaped1 = escapeVegaField(col1);
    const escaped2 = escapeVegaField(col2);

    const spec: any = {
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      data: { values: data.map((r) => ({ [col1]: r[col1], [col2]: r[col2] })) },
      width: options.width || 'container',
      height: options.height || (thumb ? 50 : 250),
      padding: thumb ? 2 : { top: 10, bottom: 25, left: 40, right: 10 },
      mark: { type: 'rect', tooltip: !thumb },
      encoding: {
        x: {
          field: escaped1,
          type: 'nominal',
          title: thumb ? '' : col1,
          axis: thumb ? null : { labelAngle: -45 },
        },
        y: {
          field: escaped2,
          type: 'nominal',
          title: thumb ? '' : col2,
          axis: thumb ? null : undefined,
        },
        color: {
          aggregate: 'count',
          type: 'quantitative',
          title: 'Count',
          legend: thumb ? null : undefined,
        },
        ...(thumb
          ? {}
          : {
              tooltip: [
                { field: escaped1, type: 'nominal', title: col1 },
                { field: escaped2, type: 'nominal', title: col2 },
                { aggregate: 'count', type: 'quantitative', title: 'Count' },
              ],
            }),
      },
    };

    await this._embed(container, spec, theme);
  },

  /**
   * Render a bivariate chart based on suggestion type.
   * Dispatches to the appropriate chart renderer with correct argument order.
   */
  async renderBivariate(
    container: string | HTMLElement,
    data: any[],
    selectedColumn: string,
    suggestion: BivariateSuggestion,
    theme: 'syto' | 'blues' = 'syto',
    options: ChartOptions = {}
  ): Promise<void> {
    const { partnerColumn, partnerType, chartType } = suggestion;
    const isPartnerNumeric = partnerType === 'integer' || partnerType === 'float';
    const isPartnerTemporal = partnerType === 'date' || partnerType === 'datetime';

    switch (chartType) {
      case 'scatter':
        return this.renderScatterPlot(
          container,
          data,
          selectedColumn,
          partnerColumn,
          theme,
          options
        );
      case 'grouped-bar':
        return isPartnerNumeric
          ? this.renderGroupedBar(container, data, partnerColumn, selectedColumn, theme, options)
          : this.renderGroupedBar(container, data, selectedColumn, partnerColumn, theme, options);
      case 'line-temporal':
        return isPartnerTemporal
          ? this.renderLineOverTime(container, data, selectedColumn, partnerColumn, theme, options)
          : this.renderLineOverTime(container, data, partnerColumn, selectedColumn, theme, options);
      case 'heatmap':
        return this.renderHeatmap(container, data, selectedColumn, partnerColumn, theme, options);
    }
  },

  // TODO: Existing chart methods (renderBoxPlot, renderHistogram, etc.) still call
  // vegaEmbed directly with duplicated error handling. Migrate them to use _embed.

  /** Shared embed helper with standard error handling */
  async _embed(container: string | HTMLElement, spec: any, theme: 'syto' | 'blues'): Promise<void> {
    const vegaTheme = theme === 'syto' ? sytoTheme : bluesTheme;
    try {
      await vegaEmbed(container, spec, {
        actions: false,
        renderer: 'svg',
        config: vegaTheme,
      });
    } catch (error: any) {
      if (error?.message && error.message.includes('does not exist')) return;
      console.error('Error rendering chart:', error);
    }
  },
};
