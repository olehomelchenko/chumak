import type { SytoApp } from '../../syto-app';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

let matchDebounceTimer: any = null;
let extractDebounceTimer: any = null;

export function validateRegexpPattern(pattern: string) {
  if (!pattern) return null;
  try {
    new RegExp(pattern);
    return null;
  } catch (e: any) {
    return `Invalid pattern: ${e.message}`;
  }
}

export function validateRegexpMatchExpression() {
  const pattern = DialogStore.regexpMatchState.pattern.value;
  DialogStore.regexpMatchState.error.value = validateRegexpPattern(pattern);
}

export function debouncedUpdateRegexpMatchPreview() {
  if (matchDebounceTimer) {
    clearTimeout(matchDebounceTimer);
  }
  matchDebounceTimer = setTimeout(() => {
    updateRegexpMatchPreview();
  }, 150);
}

export function updateRegexpMatchPreview() {
  const { sourceColumn, pattern, columnName, error } = DialogStore.regexpMatchState;
  const currentData = AppStore.currentData.value;

  if (!sourceColumn.value || !pattern.value || error.value || !currentData?.length) {
    // Clear preview
    DialogStore.previewState.rows.value = [];
    return;
  }

  try {
    const regex = new RegExp(pattern.value);
    const previewLimit = Math.min(AppStore.uxSettings.value.preview.rowLimit, 50);
    const samples = currentData.slice(0, previewLimit);
    const outputCol = columnName.value || 'is_match';

    const previewRows = samples.map((row: any) => {
      const val = row[sourceColumn.value];
      const matches = val != null ? regex.test(String(val)) : false;
      return { [sourceColumn.value]: val, [outputCol]: matches };
    });

    DialogStore.previewState.title.value = `Regexp Match: ${outputCol}`;
    DialogStore.previewState.stats.value = `Testing pattern on ${samples.length} rows`;
    DialogStore.previewState.columns.value = [sourceColumn.value, outputCol];
    DialogStore.previewState.newColumns.value = [outputCol];
    DialogStore.previewState.rows.value = previewRows;
  } catch {
    DialogStore.previewState.rows.value = [];
  }
}

export async function applyRegexpMatchTransform(this: SytoApp) {
  const { columnName, sourceColumn, pattern, error } = DialogStore.regexpMatchState;

  // Use signal values
  const colName = columnName.value;
  const srcCol = sourceColumn.value;
  const pat = pattern.value;

  if (!colName || !pat) {
    await this.alert('Please provide column name and pattern');
    return;
  }
  if (error.value) {
    await this.alert('Please fix pattern errors before applying');
    return;
  }
  if (!srcCol) {
    await this.alert('Please select a source column');
    return;
  }
  if (this.columns.includes(colName)) {
    if (
      !(await this.confirm(`Column "${colName}" already exists. It will be overwritten. Continue?`))
    )
      return;
  }

  const colRef = this.quoteColumnRef(srcCol);
  const escapedPattern = this.escapePattern(pat);
  const expression = `regexp_match(${colRef}, "${escapedPattern}")`;
  await this.runTransform('Regexp Match', { derive: { [colName]: expression } });
}

export function validateRegexpExtractExpression() {
  const pattern = DialogStore.regexpExtractState.pattern.value;
  DialogStore.regexpExtractState.error.value = validateRegexpPattern(pattern);
}

export function debouncedUpdateRegexpExtractPreview() {
  if (extractDebounceTimer) {
    clearTimeout(extractDebounceTimer);
  }
  extractDebounceTimer = setTimeout(() => {
    updateRegexpExtractPreview();
  }, 150);
}

export function updateRegexpExtractPreview() {
  const { sourceColumn, pattern, group, columnName, error } = DialogStore.regexpExtractState;
  const currentData = AppStore.currentData.value;

  if (!sourceColumn.value || !pattern.value || error.value || !currentData?.length) {
    DialogStore.previewState.rows.value = [];
    return;
  }

  try {
    const regex = new RegExp(pattern.value);
    const previewLimit = Math.min(AppStore.uxSettings.value.preview.rowLimit, 50);
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

    DialogStore.previewState.title.value = `Regexp Extract: ${outputCol}`;
    DialogStore.previewState.stats.value = `Extracting group ${groupNum} from ${samples.length} rows`;
    DialogStore.previewState.columns.value = [sourceColumn.value, outputCol];
    DialogStore.previewState.newColumns.value = [outputCol];
    DialogStore.previewState.rows.value = previewRows;
  } catch {
    DialogStore.previewState.rows.value = [];
  }
}

export async function applyRegexpExtractTransform(this: SytoApp) {
  const { columnName, sourceColumn, pattern, group, error } = DialogStore.regexpExtractState;

  const colName = columnName.value;
  const srcCol = sourceColumn.value;
  const pat = pattern.value;
  const grp = group.value;

  if (!colName || !pat) {
    await this.alert('Please provide column name and pattern');
    return;
  }
  if (error.value) {
    await this.alert('Please fix pattern errors before applying');
    return;
  }
  if (!srcCol) {
    await this.alert('Please select a source column');
    return;
  }
  if (this.columns.includes(colName)) {
    if (
      !(await this.confirm(`Column "${colName}" already exists. It will be overwritten. Continue?`))
    )
      return;
  }

  const colRef = this.quoteColumnRef(srcCol);
  const escapedPattern = this.escapePattern(pat);
  const groupNum = typeof grp === 'string' ? parseInt(grp, 10) : grp;
  const expression = `regexp_extract(${colRef}, "${escapedPattern}", ${groupNum || 0})`;
  await this.runTransform('Regexp Extract', { derive: { [colName]: expression } });
}
