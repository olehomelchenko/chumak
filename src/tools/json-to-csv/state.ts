/**
 * Signal-based state for the JSON-to-CSV tool page.
 * Self-contained — no dependency on AppStore or DialogStore.
 */

import { signal, computed } from '@preact/signals';
import Papa from 'papaparse';
import { resolvePath, getSuggestedKeys, jsonToRows } from '../../core/json-utils';

// ---------------------------------------------------------------------------
// Input signals
// ---------------------------------------------------------------------------

export const rawJson = signal<unknown>(null);
export const rawText = signal('');
export const fileName = signal('');
export const jsonPath = signal('');
export const error = signal('');

// ---------------------------------------------------------------------------
// Option signals
// ---------------------------------------------------------------------------

export const flattenEnabled = signal(false);
export const serializeEnabled = signal(true);

// ---------------------------------------------------------------------------
// Computed values
// ---------------------------------------------------------------------------

/** The JSON value at the current path */
export const resolvedValue = computed(() => {
  if (rawJson.value === null) return null;
  return jsonPath.value ? resolvePath(rawJson.value, jsonPath.value) : rawJson.value;
});

/** Suggested path segments for navigation */
export const suggestedKeys = computed(() => {
  const val = resolvedValue.value;
  if (val === null) return [];
  return getSuggestedKeys(val);
});

/** First 1000 chars of the resolved value as formatted JSON */
export const jsonRawValuePreview = computed(() => {
  const val = resolvedValue.value;
  if (val === null) return '';
  try {
    const text = JSON.stringify(val, null, 2);
    return text.length > 1000 ? text.slice(0, 1000) + '\n…' : text;
  } catch {
    return '';
  }
});

/** Whether the resolved value is a usable array of objects */
export const isValidArray = computed(() => {
  const val = resolvedValue.value;
  return Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null;
});

/** Processed rows ready for CSV export */
export const processedData = computed(() => {
  const val = resolvedValue.value;
  if (!Array.isArray(val) || val.length === 0) return { rows: [], headers: [], warning: '' };
  return jsonToRows(val, {
    flatten: flattenEnabled.value,
    serializeNested: serializeEnabled.value,
  });
});

export const previewRows = computed(() => processedData.value.rows.slice(0, 10));
export const headers = computed(() => processedData.value.headers);
export const totalRows = computed(() => processedData.value.rows.length);

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function parseText(text: string): void {
  error.value = '';
  if (!text.trim()) {
    rawJson.value = null;
    return;
  }
  try {
    rawJson.value = JSON.parse(text);
    jsonPath.value = '';
  } catch (e) {
    rawJson.value = null;
    error.value = (e as Error).message;
  }
}

export function loadFile(file: File): void {
  error.value = '';
  fileName.value = file.name.replace(/\.json$/i, '');

  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result as string;
    rawText.value = text;
    parseText(text);
    flattenEnabled.value = false;
    serializeEnabled.value = true;
  };
  reader.readAsText(file);
}

export function updateText(text: string): void {
  rawText.value = text;
  fileName.value = '';
  parseText(text);
}

export function selectPathSegment(segment: string): void {
  jsonPath.value = jsonPath.value ? `${jsonPath.value}.${segment}` : segment;
}

export function resetPath(): void {
  jsonPath.value = '';
}

export function downloadCsv(customFilename?: string): void {
  const { rows } = processedData.value;
  if (rows.length === 0) return;

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const name = (customFilename || fileName.value || 'output') + '.csv';

  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyCsv(): void {
  const { rows } = processedData.value;
  if (rows.length === 0) return;
  const csv = Papa.unparse(rows);
  navigator.clipboard.writeText(csv);
}

export function reset(): void {
  rawJson.value = null;
  rawText.value = '';
  fileName.value = '';
  jsonPath.value = '';
  error.value = '';
  flattenEnabled.value = false;
  serializeEnabled.value = true;
}
