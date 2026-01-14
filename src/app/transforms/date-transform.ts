import type { ChumakApp } from '../../chumak-app';
import { parseExpression } from '../../core/expression-parser';
import { interpretAST } from '../../core/ast-interpreter';

export function getDateColumns(this: ChumakApp): string[] {
  const schema = this.getActiveSchema();
  if (!schema) return [];
  return this.columns.filter((col) => {
    const colSchema = schema.find((c) => c.name === col);
    const type = colSchema?.type;
    return type === 'date' || type === 'datetime';
  });
}

export function getExtractParts(this: ChumakApp) {
  return [
    { value: 'year', label: 'Year', example: '2024' },
    { value: 'month', label: 'Month', example: '1-12' },
    { value: 'day', label: 'Day', example: '1-31' },
    { value: 'quarter', label: 'Quarter', example: '1-4' },
    { value: 'week', label: 'Week', example: '1-53' },
    { value: 'weekday', label: 'Weekday', example: '0-6' },
    { value: 'hour', label: 'Hour', example: '0-23' },
    { value: 'minute', label: 'Minute', example: '0-59' },
    { value: 'second', label: 'Second', example: '0-59' },
  ];
}
export function getTruncateUnits(this: ChumakApp) {
  return [
    { value: 'year', label: 'Year' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
    { value: 'day', label: 'Day' },
    { value: 'hour', label: 'Hour' },
    { value: 'minute', label: 'Minute' },
    { value: 'second', label: 'Second' },
  ];
}

export function toggleDateSelection(this: ChumakApp, value: string, event?: MouseEvent) {
  const isExtract = this.dateDialogState.operation === 'extract';
  const current = isExtract
    ? [...this.dateDialogState.extractParts]
    : [...this.dateDialogState.truncateUnits];

  if (event?.metaKey || event?.ctrlKey) {
    if (current.includes(value)) {
      if (current.length > 1) {
        const index = current.indexOf(value);
        current.splice(index, 1);
      }
    } else {
      current.push(value);
    }
  } else {
    current.length = 0;
    current.push(value);
  }

  if (isExtract) {
    this.dateDialogState.extractParts = current;
  } else {
    this.dateDialogState.truncateUnits = current;
  }
  this.updateDatePreview();
}

export function getDateOutputPlaceholder(this: ChumakApp): string {
  const { column, operation, extractParts, truncateUnits } = this.dateDialogState;
  if (!column) return '';

  if (operation === 'extract') {
    if (extractParts.length > 1) return '(Multiple columns)';
    return `${column}_${extractParts[0]}`;
  }

  if (truncateUnits.length > 1) return '(Multiple columns)';
  return `${column}_${truncateUnits[0]}_trunc`;
}

export function updateDatePreview(this: ChumakApp) {
  const { column, operation, extractParts, truncateUnits, outputColumn } = this.dateDialogState;
  if (!column || !this.currentData?.length) {
    this.clearPreview();
    return;
  }

  try {
    const samples = this.currentData.slice(0, 20);
    const colRef = this.quoteColumnRef(column);
    const activeParts = operation === 'extract' ? extractParts : truncateUnits;

    if (activeParts.length === 0) {
      this.clearPreview();
      return;
    }

    const previewRows = samples.map((row) => {
      const previewRow: any = { [column]: row[column] };
      for (const part of activeParts) {
        let outputName: string;
        if (activeParts.length === 1 && outputColumn) {
          outputName = outputColumn;
        } else {
          outputName = operation === 'extract' ? `${column}_${part}` : `${column}_${part}_trunc`;
        }

        let expression: string;
        if (operation === 'extract') {
          expression = `${part}(${colRef})`;
        } else {
          expression = `date_trunc(${colRef}, "${part}")`;
        }

        try {
          const ast = parseExpression(expression);
          const result = interpretAST(ast, row);
          previewRow[outputName] = result != null ? String(result) : '—';
        } catch {
          previewRow[outputName] = '(error)';
        }
      }
      return previewRow;
    });

    const outputCols = activeParts.map((part: string) => {
      if (activeParts.length === 1 && outputColumn) return outputColumn;
      return operation === 'extract' ? `${column}_${part}` : `${column}_${part}_trunc`;
    });

    this.previewState = {
      title: `Date: ${operation === 'extract' ? 'Extract' : 'Truncate'}`,
      stats: `Showing ${previewRows.length} sample rows`,
      columns: [column, ...outputCols],
      newColumns: outputCols,
      rows: previewRows,
      _debounceTimer: null,
    };
  } catch (e) {
    this.clearPreview();
  }
}

export async function applyDateTransform(this: ChumakApp) {
  const { column, operation, extractParts, truncateUnits, outputColumn } = this.dateDialogState;

  if (!column) {
    await this.alert('Please select a source column');
    return;
  }

  const colRef = this.quoteColumnRef(column);
  const activeParts = operation === 'extract' ? extractParts : truncateUnits;
  const deriveSpecs: Record<string, string> = {};

  for (const part of activeParts) {
    let partOutputName: string;
    if (activeParts.length === 1 && outputColumn) {
      partOutputName = outputColumn;
    } else {
      partOutputName = operation === 'extract' ? `${column}_${part}` : `${column}_${part}_trunc`;
    }

    // Check for existence
    if (this.columns.includes(partOutputName) && partOutputName !== column) {
      if (
        !(await this.confirm(
          `Column "${partOutputName}" already exists. It will be overwritten. Continue?`
        ))
      )
        return;
    }

    if (operation === 'extract') {
      deriveSpecs[partOutputName] = `${part}(${colRef})`;
    } else {
      deriveSpecs[partOutputName] = `date_trunc(${colRef}, "${part}")`;
    }
  }

  const opName =
    activeParts.length === 1
      ? operation === 'extract'
        ? `Extract ${activeParts[0]}`
        : `Truncate to ${activeParts[0]}`
      : operation === 'extract'
        ? `Extract ${activeParts.length} parts`
        : `Truncate ${activeParts.length} units`;

  await this.runTransform(opName, { derive: deriveSpecs });
}
