import * as aq from 'arquero';
import type { FullTransformStep } from '../types';

export function handleAggregate(table: any, transform: FullTransformStep): any {
  const { groupby, rollup } = transform.aggregate!;
  const op = (aq as any).op;

  let groupedTable = table;
  if (groupby && groupby.length > 0) {
    groupedTable = table.groupby(groupby);
  }

  const rollupSpecs: any = {};
  const floatCols: string[] = [];

  for (const [outCol, exprString] of Object.entries(rollup)) {
    const match = (exprString as string).match(/^op\.(\w+)\((?:'([^']+)'|"?([^"]+)"?)?\)$/);
    if (!match) throw new Error(`Invalid aggregation: ${exprString}`);

    const funcName = match[1];
    const colName = match[2] || match[3];

    if (!op[funcName]) throw new Error(`Unknown op: ${funcName}`);

    rollupSpecs[outCol] = colName ? op[funcName](colName) : op[funcName]();
    if (['mean', 'average', 'avg', 'sum', 'stdev', 'variance', 'median'].includes(funcName)) {
      floatCols.push(outCol);
    }
  }

  let result = groupedTable.rollup(rollupSpecs).ungroup();

  if (floatCols.length > 0) {
    const cleanups: any = {};
    floatCols.forEach((col) => {
      cleanups[col] = (aq as any).escape((d: any) => {
        const val = d[col];
        return typeof val === 'number' ? Math.round(val * 1e9) / 1e9 : val;
      });
    });
    result = result.derive(cleanups);
  }

  return result;
}

export const aggregateHandlers = {
  aggregate: handleAggregate,
};
