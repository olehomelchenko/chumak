import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import * as HelperHandlers from './helper-handlers';
import { StepService } from '../services/StepService';
import { createDebouncedPreview, clearPreview, PreviewResult } from './preview-engine';
import { validateRegexPattern } from './validation-engine';

export function validateRegexpMatchExpression() {
  validateRegexPattern(DialogStore.regexpMatchState.pattern.value, {
    errorSignal: DialogStore.regexpMatchState.error,
  });
}

// Preview engine instance for regexp match operations
const regexpMatchPreview = createDebouncedPreview({
  compute: (): PreviewResult | null => {
    const { sourceColumn, pattern, columnName, error } = DialogStore.regexpMatchState;
    const currentData = AppStore.currentData.value;
    const uxSettings = AppStore.uxSettings.value;

    if (!sourceColumn.value || !pattern.value || error.value || !currentData?.length) {
      return null;
    }

    const regex = new RegExp(pattern.value);
    const previewLimit = Math.min(uxSettings.preview.rowLimit, 50);
    const samples = currentData.slice(0, previewLimit);
    const outputCol = columnName.value || 'is_match';

    const previewRows = samples.map((row: any) => {
      const val = row[sourceColumn.value];
      const matches = val != null ? regex.test(String(val)) : false;
      return { [sourceColumn.value]: val, [outputCol]: matches };
    });

    return {
      title: `Regexp Match: ${outputCol}`,
      stats: `Testing pattern on ${samples.length} rows`,
      columns: [sourceColumn.value, outputCol],
      newColumns: [outputCol],
      rows: previewRows,
    };
  },
});

export function debouncedUpdateRegexpMatchPreview() {
  regexpMatchPreview.trigger();
}

export function updateRegexpMatchPreview() {
  regexpMatchPreview.compute();
}

export async function applyRegexpMatchTransform(callbacks: any, app?: any) {
  const { columnName, sourceColumn, pattern, error } = DialogStore.regexpMatchState;
  const columns = AppStore.columns.value;

  // Use signal values
  const colName = columnName.value;
  const srcCol = sourceColumn.value;
  const pat = pattern.value;

  if (!colName || !pat) {
    await callbacks.onError?.('Please provide column name and pattern');
    return;
  }
  if (error.value) {
    await callbacks.onError?.('Please fix pattern errors before applying');
    return;
  }
  if (!srcCol) {
    await callbacks.onError?.('Please select a source column');
    return;
  }
  if (columns.includes(colName) && app) {
    const confirmed = await app.confirm(
      `Column "${colName}" already exists. It will be overwritten. Continue?`
    );
    if (!confirmed) return;
  }

  const colRef = HelperHandlers.quoteColumnRef.call(null as any, srcCol);
  const escapedPattern = HelperHandlers.escapePattern.call(null as any, pat);
  const expression = `regexp_match(${colRef}, "${escapedPattern}")`;
  await StepService.runTransform('Regexp Match', { derive: { [colName]: expression } }, callbacks);
}

export function validateRegexpExtractExpression() {
  validateRegexPattern(DialogStore.regexpExtractState.pattern.value, {
    errorSignal: DialogStore.regexpExtractState.error,
  });
}

// Preview engine instance for regexp extract operations
const regexpExtractPreview = createDebouncedPreview({
  compute: (): PreviewResult | null => {
    const { sourceColumn, pattern, group, columnName, error } = DialogStore.regexpExtractState;
    const currentData = AppStore.currentData.value;
    const uxSettings = AppStore.uxSettings.value;

    if (!sourceColumn.value || !pattern.value || error.value || !currentData?.length) {
      return null;
    }

    const regex = new RegExp(pattern.value);
    const previewLimit = Math.min(uxSettings.preview.rowLimit, 50);
    const samples = currentData.slice(0, previewLimit);
    const outputCol = columnName.value || 'extracted';
    const groupNum = group.value || 0;

    const previewRows = samples.map((row: any) => {
      const val = row[sourceColumn.value];
      let extracted: string | null = null;
      if (val != null) {
        const match = String(val).match(regex);
        extracted = match ? (match[groupNum] ?? match[0]) : null;
      }
      return { [sourceColumn.value]: val, [outputCol]: extracted ?? '(no match)' };
    });

    return {
      title: `Regexp Extract: ${outputCol}`,
      stats: `Extracting group ${groupNum} from ${samples.length} rows`,
      columns: [sourceColumn.value, outputCol],
      newColumns: [outputCol],
      rows: previewRows,
    };
  },
});

export function debouncedUpdateRegexpExtractPreview() {
  regexpExtractPreview.trigger();
}

export function updateRegexpExtractPreview() {
  regexpExtractPreview.compute();
}

// Re-export from engines for backward compatibility
export { clearPreview };

// Re-export validateRegexpPattern for backward compatibility
// Note: Uses the new validation engine under the hood
export function validateRegexpPattern(pattern: string): string | null {
  const result = validateRegexPattern(pattern);
  return result.error;
}

export async function applyRegexpExtractTransform(callbacks: any, app?: any) {
  const { columnName, sourceColumn, pattern, group, error } = DialogStore.regexpExtractState;
  const columns = AppStore.columns.value;

  const colName = columnName.value;
  const srcCol = sourceColumn.value;
  const pat = pattern.value;
  const grp = group.value;

  if (!colName || !pat) {
    await callbacks.onError?.('Please provide column name and pattern');
    return;
  }
  if (error.value) {
    await callbacks.onError?.('Please fix pattern errors before applying');
    return;
  }
  if (!srcCol) {
    await callbacks.onError?.('Please select a source column');
    return;
  }
  if (columns.includes(colName) && app) {
    const confirmed = await app.confirm(
      `Column "${colName}" already exists. It will be overwritten. Continue?`
    );
    if (!confirmed) return;
  }

  const colRef = HelperHandlers.quoteColumnRef.call(null as any, srcCol);
  const escapedPattern = HelperHandlers.escapePattern.call(null as any, pat);
  const groupNum = typeof grp === 'string' ? parseInt(grp, 10) : grp;
  const expression = `regexp_extract(${colRef}, "${escapedPattern}", ${groupNum || 0})`;
  await StepService.runTransform(
    'Regexp Extract',
    { derive: { [colName]: expression } },
    callbacks
  );
}
