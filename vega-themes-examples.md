# Vega Themes Examples

## "Excel" theme:

```ts
import { Config } from './config.js';

const markColor = '#4572a7';

const excelTheme: Config = {
  background: '#fff',

  arc: { fill: markColor },
  area: { fill: markColor },
  line: { stroke: markColor, strokeWidth: 2 },
  path: { stroke: markColor },
  rect: { fill: markColor },
  shape: { stroke: markColor },
  symbol: { fill: markColor, strokeWidth: 1.5, size: 50 },

  axis: {
    bandPosition: 0.5,
    grid: true,
    gridColor: '#000000',
    gridOpacity: 1,
    gridWidth: 0.5,
    labelPadding: 10,
    tickSize: 5,
    tickWidth: 0.5,
  },

  axisBand: {
    grid: false,
    tickExtra: true,
  },

  legend: {
    labelBaseline: 'middle',
    labelFontSize: 11,
    symbolSize: 50,
    symbolType: 'square',
  },

  range: {
    category: [
      '#4572a7',
      '#aa4643',
      '#8aa453',
      '#71598e',
      '#4598ae',
      '#d98445',
      '#94aace',
      '#d09393',
      '#b9cc98',
      '#a99cbc',
    ],
  },
};

export default excelTheme;
```

## "ggplot" theme:

```ts
import { Config } from './config.js';

const markColor = '#000';

const ggplot2Theme: Config = {
  group: {
    fill: '#e5e5e5',
  },

  arc: { fill: markColor },
  area: { fill: markColor },
  line: { stroke: markColor },
  path: { stroke: markColor },
  rect: { fill: markColor },
  shape: { stroke: markColor },
  symbol: { fill: markColor, size: 40 },

  axis: {
    domain: false,
    grid: true,
    gridColor: '#FFFFFF',
    gridOpacity: 1,
    labelColor: '#7F7F7F',
    labelPadding: 4,
    tickColor: '#7F7F7F',
    tickSize: 5.67,
    titleFontSize: 16,
    titleFontWeight: 'normal',
  },

  legend: {
    labelBaseline: 'middle',
    labelFontSize: 11,
    symbolSize: 40,
  },

  range: {
    category: [
      '#000000',
      '#7F7F7F',
      '#1A1A1A',
      '#999999',
      '#333333',
      '#B0B0B0',
      '#4D4D4D',
      '#C9C9C9',
      '#666666',
      '#DCDCDC',
    ],
  },
};

export default ggplot2Theme;
```

## "Power BI" theme

```ts
import { Config } from './config.js';

const ptToPx = (value: number) => value * (1 / 3 + 1);

const fontSmallPx = ptToPx(9);
const legendFontPx = ptToPx(10);
const fontLargePx = ptToPx(12);
const fontStandard = 'Segoe UI';
const fontTitle = 'wf_standard-font, helvetica, arial, sans-serif';
const firstLevelElementColor = '#252423';
const secondLevelElementColor = '#605E5C';
const backgroundColor = 'transparent';
const backgroundSecondaryColor = '#C8C6C4';
const paletteColor1 = '#118DFF';
const paletteColor2 = '#12239E';
const paletteColor3 = '#E66C37';
const paletteColor4 = '#6B007B';
const paletteColor5 = '#E044A7';
const paletteColor6 = '#744EC2';
const paletteColor7 = '#D9B300';
const paletteColor8 = '#D64550';
const divergentColorMax = paletteColor1;
const divergentColorMin = '#DEEFFF';
const divergentPalette = [divergentColorMin, divergentColorMax];
const ordinalPalette = [
  divergentColorMin,
  '#c7e4ff',
  '#b0d9ff',
  '#9aceff',
  '#83c3ff',
  '#6cb9ff',
  '#55aeff',
  '#3fa3ff',
  '#2898ff',
  divergentColorMax,
];

const powerbiTheme: Config = {
  view: { stroke: backgroundColor },
  background: backgroundColor,
  font: fontStandard,
  header: {
    titleFont: fontTitle,
    titleFontSize: fontLargePx,
    titleColor: firstLevelElementColor,
    labelFont: fontStandard,
    labelFontSize: legendFontPx,
    labelColor: secondLevelElementColor,
  },
  axis: {
    ticks: false,
    grid: false,
    domain: false,
    labelColor: secondLevelElementColor,
    labelFontSize: fontSmallPx,
    titleFont: fontTitle,
    titleColor: firstLevelElementColor,
    titleFontSize: fontLargePx,
    titleFontWeight: 'normal',
  },
  axisQuantitative: {
    tickCount: 3,
    grid: true,
    gridColor: backgroundSecondaryColor,
    gridDash: [1, 5],
    labelFlush: false,
  },
  axisBand: { tickExtra: true },
  axisX: { labelPadding: 5 },
  axisY: { labelPadding: 10 },
  bar: { fill: paletteColor1 },
  line: {
    stroke: paletteColor1,
    strokeWidth: 3,
    strokeCap: 'round',
    strokeJoin: 'round',
  },
  text: { font: fontStandard, fontSize: fontSmallPx, fill: secondLevelElementColor },
  arc: { fill: paletteColor1 },
  area: { fill: paletteColor1, line: true, opacity: 0.6 },
  path: { stroke: paletteColor1 },
  rect: { fill: paletteColor1 },
  point: { fill: paletteColor1, filled: true, size: 75 },
  shape: { stroke: paletteColor1 },
  symbol: { fill: paletteColor1, strokeWidth: 1.5, size: 50 },
  legend: {
    titleFont: fontStandard,
    titleFontWeight: 'bold',
    titleColor: secondLevelElementColor,
    labelFont: fontStandard,
    labelFontSize: legendFontPx,
    labelColor: secondLevelElementColor,
    symbolType: 'circle',
    symbolSize: 75,
  },
  range: {
    category: [
      paletteColor1,
      paletteColor2,
      paletteColor3,
      paletteColor4,
      paletteColor5,
      paletteColor6,
      paletteColor7,
      paletteColor8,
    ],
    diverging: divergentPalette,
    heatmap: divergentPalette,
    ordinal: ordinalPalette,
  },
};

export default powerbiTheme;
```

## "quartz" theme

```ts
import { Config } from './config.js';

const markColor = '#ab5787';
const axisColor = '#979797';

const quartzTheme: Config = {
  background: '#f9f9f9',

  arc: { fill: markColor },
  area: { fill: markColor },
  line: { stroke: markColor },
  path: { stroke: markColor },
  rect: { fill: markColor },
  shape: { stroke: markColor },
  symbol: { fill: markColor, size: 30 },

  axis: {
    domainColor: axisColor,
    domainWidth: 0.5,
    gridWidth: 0.2,
    labelColor: axisColor,
    tickColor: axisColor,
    tickWidth: 0.2,
    titleColor: axisColor,
  },

  axisBand: {
    grid: false,
  },

  axisX: {
    grid: true,
    tickSize: 10,
  },

  axisY: {
    domain: false,
    grid: true,
    tickSize: 0,
  },

  legend: {
    labelFontSize: 11,
    padding: 1,
    symbolSize: 30,
    symbolType: 'square',
  },

  range: {
    category: [
      '#ab5787',
      '#51b2e5',
      '#703c5c',
      '#168dd9',
      '#d190b6',
      '#00609f',
      '#d365ba',
      '#154866',
      '#666666',
      '#c4c4c4',
    ],
  },
};

export default quartzTheme;
```
