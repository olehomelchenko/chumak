import * as aq from 'arquero';
import type { FullTransformStep } from '../types';
import { isConversionError } from '../../type-converter';

export function handleImpute(table: any, transform: FullTransformStep): any {
  const { column, strategy, value, includeEmptyString } = transform.impute!;
  const op = (aq as any).op;

  // Helper to check for missing values (includes conversion errors)
  const isMissing = includeEmptyString
    ? (v: any) =>
        v == null || (typeof v === 'number' && isNaN(v)) || v === '' || isConversionError(v)
    : (v: any) => v == null || (typeof v === 'number' && isNaN(v)) || isConversionError(v);

  switch (strategy) {
    case 'constant':
      return table.derive({
        [column]: aq.escape((d: any) => (isMissing(d[column]) ? value : d[column])),
      });

    case 'mean':
    case 'median':
    case 'min':
    case 'max': {
      const aggFunc = strategy === 'mean' ? op.mean : (op as any)[strategy];
      // For numeric aggregates, filter to strictly numeric values first
      // to avoid coercion of "" or other non-numeric types to 0.
      const numericTable = table.filter(
        aq.escape(
          (d: any) =>
            d[column] !== null &&
            d[column] !== undefined &&
            typeof d[column] === 'number' &&
            !isNaN(d[column])
        )
      );
      const aggValue =
        numericTable.numRows() > 0
          ? numericTable.rollup({ m: aggFunc(column) }).object(0)?.m
          : undefined;
      return table.derive({
        [column]: aq.escape((d: any) => (isMissing(d[column]) ? aggValue : d[column])),
      });
    }

    case 'forwardFill':
      // op.fill_down is a window function, but it only works on null/undefined.
      // If we need to include empty strings, we might need a manual pass.
      if (includeEmptyString) {
        const rows = table.objects();
        let lastVal: any = null;
        const resultRows = rows.map((r: any) => {
          const val = r[column];
          if (!isMissing(val)) {
            lastVal = val;
          }
          return { ...r, [column]: isMissing(val) ? lastVal : val };
        });
        return (aq as any).from(resultRows);
      }
      return table.derive({ [column]: op.fill_down(column) });

    case 'backwardFill':
      if (includeEmptyString) {
        const rows = table.objects();
        let lastVal: any = null;
        const resultRows = new Array(rows.length);
        for (let i = rows.length - 1; i >= 0; i--) {
          const r = rows[i];
          const val = r[column];
          if (!isMissing(val)) {
            lastVal = val;
          }
          resultRows[i] = { ...r, [column]: isMissing(val) ? lastVal : val };
        }
        return (aq as any).from(resultRows);
      }
      return table.derive({ [column]: op.fill_up(column) });

    case 'linearInterpolation': {
      const rows = table.objects();
      const n = rows.length;
      if (n < 2) return table;

      const resultRows = rows.map((r: any) => ({ ...r }));

      for (let i = 0; i < n; i++) {
        const val = resultRows[i][column];
        if (isMissing(val)) {
          // Find neighbors
          let prevIdx = i - 1;
          while (prevIdx >= 0) {
            const v = resultRows[prevIdx][column];
            if (!isMissing(v) && typeof v === 'number') break;
            prevIdx--;
          }

          let nextIdx = i + 1;
          while (nextIdx < n) {
            const v = resultRows[nextIdx][column];
            if (!isMissing(v) && typeof v === 'number') break;
            nextIdx++;
          }

          if (prevIdx >= 0 && nextIdx < n) {
            const v0 = resultRows[prevIdx][column];
            const v1 = resultRows[nextIdx][column];
            const dist = nextIdx - prevIdx;
            const step = (v1 - v0) / dist;
            resultRows[i][column] = v0 + step * (i - prevIdx);
          }
        }
      }
      return (aq as any).from(resultRows);
    }

    default:
      return table;
  }
}

export const imputeHandlers = {
  impute: handleImpute,
};
