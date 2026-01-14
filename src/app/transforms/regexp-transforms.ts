import type { ChumakApp } from '../../chumak-app';

export function validateRegexpPattern(this: ChumakApp, pattern: string) {
  if (!pattern) return null;
  try {
    new RegExp(pattern);
    return null;
  } catch (e: any) {
    return `Invalid pattern: ${e.message}`;
  }
}

export function validateRegexpMatchExpression(this: ChumakApp) {
  const { pattern } = this.regexpMatchDialogState;
  this.regexpMatchDialogState.error = this.validateRegexpPattern(pattern);
}

export function debouncedUpdateRegexpMatchPreview(this: ChumakApp) {
  if (this.previewState._debounceTimer) {
    clearTimeout(this.previewState._debounceTimer);
  }
  this.previewState._debounceTimer = setTimeout(() => {
    this.updateRegexpMatchPreview();
  }, 150);
}

export function updateRegexpMatchPreview(this: ChumakApp) {
  const { sourceColumn, pattern, columnName } = this.regexpMatchDialogState;
  if (!sourceColumn || !pattern || this.regexpMatchDialogState.error || !this.currentData?.length) {
    this.clearPreview();
    return;
  }

  try {
    const regex = new RegExp(pattern);
    const previewLimit = Math.min(this.getPreviewRowLimit(), 50);
    const samples = this.currentData.slice(0, previewLimit);
    const outputCol = columnName || 'is_match';

    const previewRows = samples.map((row: any) => {
      const val = row[sourceColumn];
      const matches = val != null ? regex.test(String(val)) : false;
      return { [sourceColumn]: val, [outputCol]: matches };
    });

    this.previewState = {
      title: `Regexp Match: ${outputCol}`,
      stats: `Testing pattern on ${samples.length} rows`,
      columns: [sourceColumn, outputCol],
      newColumns: [outputCol],
      rows: previewRows,
      _debounceTimer: null,
    };
  } catch {
    this.clearPreview();
  }
}

export async function applyRegexpMatchTransform(this: ChumakApp) {
  const { columnName, sourceColumn, pattern } = this.regexpMatchDialogState;
  if (!columnName || !pattern) {
    await this.alert('Please provide column name and pattern');
    return;
  }
  if (this.regexpMatchDialogState.error) {
    await this.alert('Please fix pattern errors before applying');
    return;
  }
  if (!sourceColumn) {
    await this.alert('Please select a source column');
    return;
  }
  if (this.columns.includes(columnName)) {
    if (
      !(await this.confirm(
        `Column "${columnName}" already exists. It will be overwritten. Continue?`
      ))
    )
      return;
  }

  const colRef = this.quoteColumnRef(sourceColumn);
  const escapedPattern = this.escapePattern(pattern);
  const expression = `regexp_match(${colRef}, "${escapedPattern}")`;
  await this.runTransform('Regexp Match', { derive: { [columnName]: expression } });
}

export function validateRegexpExtractExpression(this: ChumakApp) {
  const { pattern } = this.regexpExtractDialogState;
  this.regexpExtractDialogState.error = this.validateRegexpPattern(pattern);
}

export function debouncedUpdateRegexpExtractPreview(this: ChumakApp) {
  if (this.previewState._debounceTimer) {
    clearTimeout(this.previewState._debounceTimer);
  }
  this.previewState._debounceTimer = setTimeout(() => {
    this.updateRegexpExtractPreview();
  }, 150);
}

export function updateRegexpExtractPreview(this: ChumakApp) {
  const { sourceColumn, pattern, group, columnName } = this.regexpExtractDialogState;
  if (
    !sourceColumn ||
    !pattern ||
    this.regexpExtractDialogState.error ||
    !this.currentData?.length
  ) {
    this.clearPreview();
    return;
  }

  try {
    const regex = new RegExp(pattern);
    const previewLimit = Math.min(this.getPreviewRowLimit(), 50);
    const samples = this.currentData.slice(0, previewLimit);
    const outputCol = columnName || 'extracted';
    const groupNum = group || 0;

    const previewRows = samples.map((row: any) => {
      const val = row[sourceColumn];
      let extracted: string | null = null;
      if (val != null) {
        const match = String(val).match(regex);
        extracted = match ? (match[groupNum] ?? match[0]) : null;
      }
      return { [sourceColumn]: val, [outputCol]: extracted ?? '(no match)' };
    });

    this.previewState = {
      title: `Regexp Extract: ${outputCol}`,
      stats: `Extracting group ${groupNum} from ${samples.length} rows`,
      columns: [sourceColumn, outputCol],
      newColumns: [outputCol],
      rows: previewRows,
      _debounceTimer: null,
    };
  } catch {
    this.clearPreview();
  }
}

export async function applyRegexpExtractTransform(this: ChumakApp) {
  const { columnName, sourceColumn, pattern, group } = this.regexpExtractDialogState;
  if (!columnName || !pattern) {
    await this.alert('Please provide column name and pattern');
    return;
  }
  if (this.regexpExtractDialogState.error) {
    await this.alert('Please fix pattern errors before applying');
    return;
  }
  if (!sourceColumn) {
    await this.alert('Please select a source column');
    return;
  }
  if (this.columns.includes(columnName)) {
    if (
      !(await this.confirm(
        `Column "${columnName}" already exists. It will be overwritten. Continue?`
      ))
    )
      return;
  }

  const colRef = this.quoteColumnRef(sourceColumn);
  const escapedPattern = this.escapePattern(pattern);
  const groupNum = typeof group === 'string' ? parseInt(group, 10) : group;
  const expression = `regexp_extract(${colRef}, "${escapedPattern}", ${groupNum || 0})`;
  await this.runTransform('Regexp Extract', { derive: { [columnName]: expression } });
}
