import type { DataRow } from '../types';
import Papa from 'papaparse';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { Source } from '../types';
import { SchemaEngine, ColumnSchema } from '../../core/schema-engine';
import { ReplaceSourceService } from '../services/ReplaceSourceService';
import { alert, confirm } from './notification-handlers';

/**
 * Import dialog state structure
 * Note: Types are permissive to support backward compatibility with SytoApp
 */
export interface ImportDialogState {
  fileName: string;
  sourceName: string;
  rawPreviewData: string[][];
  previewHeaders: string[];
  previewDataRows: any[][];
  headerMode: string;
  delimiter: string;
  originalHeaders: string[];
  customHeaders: string[];
  duplicateWarning: string;
  isJson?: boolean;
  jsonData?: any[] | null;
  fullJsonData?: any;
  jsonPath?: string;
  jsonRawValuePreview?: string;
  suggestedJsonKeys?: string[];
  flattenJson?: boolean;
  serializeNested?: boolean;
}

/**
 * Callbacks for import operations
 */
export type ImportCallbacks = {
  openDialog: (name: string, section?: string) => void;
  closeDialog: (force?: boolean) => void;
  createSource: (
    file: File,
    name: string,
    columns: string[],
    data: any[],
    headerMode: string,
    delimiter: string,
    customHeaders: string[] | null,
    format?: string
  ) => Promise<void>;
};

let callbacks: ImportCallbacks | null = null;

/**
 * Set import callbacks for store-based operations
 */
export function setImportCallbacks(cb: ImportCallbacks): void {
  callbacks = cb;
}

/**
 * Legacy SytoApp interface for backward compatibility
 */
interface LegacyApp extends ImportCallbacks {
  isDragging: boolean;
  importFileData: { file: File } | null;
  importDialogState: ImportDialogState;
  importUrlDialogState: any;
  alert: (message: string) => Promise<boolean>;
  confirm: (message: string, title?: string) => Promise<boolean>;
  showImportDialog: (file: File) => void;
  handleJsonPreview: (file: File, data: any, path?: string) => void;
  handleCsvPreview: (file: File) => void;
  updateJsonPath: () => void;
  resolvePath: (obj: any, path: string) => any;
  getSuggestedKeys: (obj: any) => string[];
  flattenData: (data: any[]) => any[];
  serializeNestedData: (data: any[]) => any[];
  updateHeadersForPreview: () => void;
  resolveDuplicateHeaders: (headers: string[]) => { resolvedHeaders: string[]; warning: string };
  computeSchemaDiffForPreview: (
    oldSchema: ColumnSchema[],
    previewColumns: string[],
    previewData: any[][]
  ) => void;
}

/**
 * Get callbacks from legacy app or stored callbacks
 */
function getCallbacks(legacyApp?: LegacyApp): ImportCallbacks | null {
  if (legacyApp) {
    return legacyApp;
  }
  return callbacks;
}

// ============================================================================
// Pure Functions (no this context needed)
// ============================================================================

/**
 * Resolve a path in a JSON object (e.g., "data.items.0")
 */
export function resolvePath(obj: any, path: string): any {
  if (!path) return obj;
  try {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (Array.isArray(current) && /^\d+$/.test(part)) {
        current = current[parseInt(part, 10)];
      } else {
        current = current[part];
      }
    }
    return current;
  } catch (e) {
    return undefined;
  }
}

/**
 * Get suggested keys for JSON path navigation
 */
export function getSuggestedKeys(obj: any): string[] {
  if (obj === null || typeof obj !== 'object') return [];
  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      return ['0', ...Object.keys(obj[0] || {})];
    }
    return [];
  }
  return Object.keys(obj);
}

/**
 * Flatten nested JSON objects
 */
export function flattenData(data: any[]): any[] {
  return data.map((item) => {
    const flattened: any = {};
    const flatten = (obj: any, prefix = '') => {
      if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        const key = prefix.slice(0, -1);
        if (key) flattened[key] = obj;
        return;
      }
      Object.keys(obj).forEach((k) => {
        flatten(obj[k], `${prefix}${k}_`);
      });
    };
    flatten(item);
    return flattened;
  });
}

/**
 * Serialize nested objects to JSON strings
 */
export function serializeNestedData(data: any[]): any[] {
  return data.map((item) => {
    const newItem: any = {};
    Object.keys(item).forEach((key) => {
      const val = item[key];
      if (val !== null && typeof val === 'object') {
        newItem[key] = JSON.stringify(val);
      } else {
        newItem[key] = val;
      }
    });
    return newItem;
  });
}

/**
 * Resolve duplicate headers by adding suffixes
 */
export function resolveDuplicateHeaders(headers: string[]): {
  resolvedHeaders: string[];
  warning: string;
} {
  const seen: Record<string, number> = {};
  const duplicates: { name: string; positions: number[] }[] = [];
  const resolvedHeaders: string[] = [];
  headers.forEach((header, index) => {
    let finalHeader = header;
    if (seen[header] !== undefined) {
      if (!duplicates.some((d) => d.name === header)) {
        duplicates.push({ name: header, positions: [seen[header] + 1] });
      }
      const dupEntry = duplicates.find((d) => d.name === header)!;
      dupEntry.positions.push(index + 1);
      let suffix = 2;
      while (seen[`${header}_${suffix}`] !== undefined) suffix++;
      finalHeader = `${header}_${suffix}`;
    }
    seen[finalHeader] = index;
    resolvedHeaders.push(finalHeader);
  });
  let warning = '';
  if (duplicates.length > 0) {
    const dupList = duplicates
      .map((d) => `"${d.name}" at positions ${d.positions.join(', ')}`)
      .join('; ');
    warning = `Found ${duplicates.length} duplicate column name${duplicates.length > 1 ? 's' : ''}: ${dupList}`;
  }
  return { resolvedHeaders, warning };
}

/**
 * Compute schema diff for preview
 */
export function computeSchemaDiffForPreview(
  oldSchema: ColumnSchema[],
  previewColumns: string[],
  previewData: any[][]
): void {
  const rowObjects = previewData.map((row) => {
    const obj: Record<string, any> = {};
    previewColumns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });

  const newSchema = SchemaEngine.createPhysicalSchema(rowObjects);
  const diff = SchemaEngine.compareSchemas(oldSchema, newSchema);
  DialogStore.importCsvState.schemaDiff.value = diff;
}

// ============================================================================
// Event Handlers
// ============================================================================

export function handleFileSelect(this: LegacyApp | void, event: Event): void {
  const legacyApp = this as LegacyApp | undefined;
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (legacyApp) {
    legacyApp.showImportDialog(file);
  } else {
    showImportDialog(file);
  }
  target.value = '';
}

export async function handleFileDrop(this: LegacyApp | void, event: DragEvent): Promise<void> {
  const legacyApp = this as LegacyApp | undefined;

  if (legacyApp) {
    legacyApp.isDragging = false;
  } else {
    AppStore.isDragging.value = false;
  }

  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  const file = files[0];
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.csv') && !fileName.endsWith('.json')) {
    if (legacyApp?.alert) {
      await legacyApp.alert('Please drop a CSV or JSON file');
    } else {
      await alert('Please drop a CSV or JSON file');
    }
    return;
  }

  if (legacyApp) {
    legacyApp.showImportDialog(file);
  } else {
    showImportDialog(file);
  }
}

export async function handlePaste(this: LegacyApp | void, event: ClipboardEvent): Promise<void> {
  const legacyApp = this as LegacyApp | undefined;
  const target = event.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    return;
  const clipboardData = event.clipboardData;
  if (!clipboardData) return;
  if (clipboardData.files && clipboardData.files.length > 0) {
    const file = clipboardData.files[0];
    const fn = file.name.toLowerCase();
    if (
      fn.endsWith('.csv') ||
      fn.endsWith('.json') ||
      file.type === 'text/csv' ||
      file.type === 'application/json' ||
      file.type === 'text/plain'
    ) {
      if (legacyApp) {
        legacyApp.showImportDialog(file);
      } else {
        showImportDialog(file);
      }
      return;
    }
  }
  const pastedText = clipboardData.getData('text');
  if (pastedText && pastedText.trim().length > 0) {
    const trimmed = pastedText.trim();
    const isLikelyJson =
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'));
    const file = new File([pastedText], isLikelyJson ? 'Pasted Data.json' : 'Pasted Data.csv', {
      type: isLikelyJson ? 'application/json' : 'text/csv',
    });
    if (legacyApp) {
      legacyApp.showImportDialog(file);
    } else {
      showImportDialog(file);
    }
  }
}

export async function promptPaste(this: LegacyApp | void): Promise<void> {
  const legacyApp = this as LegacyApp | undefined;

  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length > 0) {
        const trimmed = text.trim();
        const isLikelyJson =
          (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
          (trimmed.startsWith('{') && trimmed.endsWith('}'));
        const file = new File([text], isLikelyJson ? 'Pasted Data.json' : 'Pasted Data.csv', {
          type: isLikelyJson ? 'application/json' : 'text/csv',
        });
        if (legacyApp) {
          legacyApp.showImportDialog(file);
        } else {
          showImportDialog(file);
        }
      } else {
        const msg =
          'Clipboard is empty or does not contain text. Try copying some CSV or JSON data first.';
        if (legacyApp?.alert) {
          await legacyApp.alert(msg);
        } else {
          await alert(msg);
        }
      }
    } else {
      const msg =
        'Your browser does not support direct clipboard access. Please use Ctrl+V to paste data.';
      if (legacyApp?.alert) {
        await legacyApp.alert(msg);
      } else {
        await alert(msg);
      }
    }
  } catch (err) {
    console.warn('Clipboard access denied:', err);
    const msg = 'Please press Ctrl+V to paste your data directly.';
    if (legacyApp?.alert) {
      await legacyApp.alert(msg);
    } else {
      await alert(msg);
    }
  }
}

// ============================================================================
// Import Dialog Functions
// ============================================================================

export function showImportDialog(this: LegacyApp | void, file: File): void {
  const legacyApp = this as LegacyApp | undefined;

  if (legacyApp) {
    legacyApp.importFileData = { file };
  } else {
    AppStore.importFileData.value = { file };
  }

  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.json')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (legacyApp) {
          legacyApp.handleJsonPreview(file, data);
        } else {
          handleJsonPreview(file, data);
        }
      } catch (err) {
        if (legacyApp) {
          legacyApp.handleCsvPreview(file);
        } else {
          handleCsvPreview(file);
        }
      }
    };
    reader.readAsText(file);
  } else {
    if (legacyApp) {
      legacyApp.handleCsvPreview(file);
    } else {
      handleCsvPreview(file);
    }
  }
}

export function handleJsonPreview(this: LegacyApp | void, file: File, data: any, path = ''): void {
  const legacyApp = this as LegacyApp | undefined;
  const cb = getCallbacks(legacyApp);

  const defaultName = file.name.replace(/\.json$/i, '');
  let resolvedData = data;

  if (path) {
    resolvedData = resolvePath(data, path);
  }

  const isValidArray =
    Array.isArray(resolvedData) &&
    resolvedData.length > 0 &&
    typeof resolvedData[0] === 'object' &&
    resolvedData[0] !== null;

  const previewLimit = AppStore.uxSettings.value.preview.rowLimit;
  const previewData = isValidArray ? resolvedData.slice(0, previewLimit) : [];
  const headers = isValidArray ? Object.keys(previewData[0]) : [];

  const prevState = legacyApp?.importDialogState;
  const newState: ImportDialogState = {
    fileName: file.name,
    sourceName: defaultName,
    rawPreviewData: [],
    previewHeaders: headers,
    previewDataRows: previewData.map((row: any) => headers.map((h) => row[h])),
    headerMode: 'first-row',
    delimiter: ',',
    originalHeaders: headers,
    customHeaders: [...headers],
    duplicateWarning: '',
    isJson: true,
    jsonData: isValidArray ? resolvedData : null,
    fullJsonData: data,
    jsonPath: path,
    jsonRawValuePreview: resolvedData ? JSON.stringify(resolvedData, null, 2).slice(0, 1000) : '',
    suggestedJsonKeys: getSuggestedKeys(resolvedData),
    flattenJson: prevState?.flattenJson ?? false,
    serializeNested: prevState?.serializeNested ?? true,
  };

  if (legacyApp) {
    legacyApp.importDialogState = newState;
  } else {
    // Update DialogStore signals
    const s = DialogStore.importCsvState;
    s.sourceName.value = newState.sourceName;
    s.isJson.value = newState.isJson ?? false;
    s.jsonPath.value = newState.jsonPath || '';
    s.jsonRawValuePreview.value = newState.jsonRawValuePreview || '';
    s.suggestedJsonKeys.value = newState.suggestedJsonKeys || [];
    s.flattenJson.value = newState.flattenJson || false;
    s.serializeNested.value = newState.serializeNested ?? true;
    s.jsonData.value = newState.jsonData ?? null;
    s.delimiter.value = newState.delimiter;
    s.headerMode.value = newState.headerMode as 'first-row' | 'auto-generate' | 'manual';
    s.customHeaders.value = newState.customHeaders;
    s.duplicateWarning.value = newState.duplicateWarning;
    s.previewHeaders.value = newState.previewHeaders;
    s.previewDataRows.value = newState.previewDataRows;
  }

  // If in replace mode, compute schema diff
  if (DialogStore.importCsvState.isReplaceMode.value) {
    const sourceId = DialogStore.importCsvState.targetSourceId.value;
    const source = AppStore.sources.value.find((s) => s.id === sourceId);
    if (source) {
      computeSchemaDiffForPreview(source.columns, headers, previewData);
    }
  }

  cb?.openDialog('import-csv');
}

export function updateJsonPath(this: LegacyApp | void): void {
  const legacyApp = this as LegacyApp | undefined;

  let fullJsonData: any;
  let jsonPath: string;
  let fileName: string;

  if (legacyApp) {
    fullJsonData = legacyApp.importDialogState.fullJsonData;
    jsonPath = legacyApp.importDialogState.jsonPath || '';
    fileName = legacyApp.importDialogState.fileName;
  } else {
    // For store-based, we'd need to track fullJsonData somewhere
    // For now, this path is primarily used with legacy app
    return;
  }

  if (!fullJsonData) return;

  const fileMock = { name: fileName } as File;
  if (legacyApp) {
    legacyApp.handleJsonPreview(fileMock, fullJsonData, jsonPath);
  } else {
    handleJsonPreview(fileMock, fullJsonData, jsonPath);
  }
}

export function selectJsonPathSegment(this: LegacyApp | void, segment: string): void {
  const legacyApp = this as LegacyApp | undefined;

  if (legacyApp) {
    const currentPath = legacyApp.importDialogState.jsonPath || '';
    const newPath = currentPath ? `${currentPath}.${segment}` : segment;
    legacyApp.importDialogState.jsonPath = newPath;
    legacyApp.updateJsonPath();
  } else {
    const currentPath = DialogStore.importCsvState.jsonPath.value;
    const newPath = currentPath ? `${currentPath}.${segment}` : segment;
    DialogStore.importCsvState.jsonPath.value = newPath;
    updateJsonPath();
  }
}

export function resetJsonPath(this: LegacyApp | void): void {
  const legacyApp = this as LegacyApp | undefined;

  if (legacyApp) {
    legacyApp.importDialogState.jsonPath = '';
    legacyApp.updateJsonPath();
  } else {
    DialogStore.importCsvState.jsonPath.value = '';
    updateJsonPath();
  }
}

export function handleCsvPreview(this: LegacyApp | void, file: File): void {
  const legacyApp = this as LegacyApp | undefined;
  const cb = getCallbacks(legacyApp);
  const previewLimit = AppStore.uxSettings.value.preview.rowLimit;

  Papa.parse(file, {
    preview: previewLimit,
    header: false,
    skipEmptyLines: true,
    complete: (previewResult) => {
      const data = previewResult.data as string[][];
      const firstRow = data[0] || [];
      const defaultName = file.name.replace(/\.csv$/i, '');
      const initialHeaders = firstRow.map((cell, i) => cell || `Column ${i + 1}`);

      const newState: ImportDialogState = {
        fileName: file.name,
        sourceName: defaultName,
        rawPreviewData: data,
        previewHeaders: [],
        previewDataRows: [],
        headerMode: 'first-row',
        delimiter: previewResult.meta.delimiter || ',',
        originalHeaders: initialHeaders,
        customHeaders: initialHeaders,
        duplicateWarning: '',
        isJson: false,
        jsonData: null,
      };

      if (legacyApp) {
        legacyApp.importDialogState = newState;
        legacyApp.updateHeadersForPreview();
      } else {
        const s = DialogStore.importCsvState;
        s.sourceName.value = newState.sourceName;
        s.isJson.value = false;
        s.delimiter.value = newState.delimiter;
        s.headerMode.value = newState.headerMode as 'first-row' | 'auto-generate' | 'manual';
        s.customHeaders.value = newState.customHeaders;
        s.previewHeaders.value = newState.previewHeaders;
        s.previewDataRows.value = newState.previewDataRows;
        updateHeadersForPreview();
      }

      // If in replace mode, compute schema diff
      if (DialogStore.importCsvState.isReplaceMode.value) {
        const sourceId = DialogStore.importCsvState.targetSourceId.value;
        const source = AppStore.sources.value.find((s) => s.id === sourceId);
        if (source) {
          const previewHeaders =
            legacyApp?.importDialogState.previewHeaders ??
            DialogStore.importCsvState.previewHeaders.value;
          const previewDataRows =
            legacyApp?.importDialogState.previewDataRows ??
            DialogStore.importCsvState.previewDataRows.value;
          computeSchemaDiffForPreview(source.columns, previewHeaders, previewDataRows);
        }
      }

      cb?.openDialog('import-csv');
    },
    error: async (error) => {
      console.error('CSV preview error:', error);
      if (legacyApp?.alert) {
        await legacyApp.alert('Error reading CSV: ' + error.message);
      } else {
        await alert('Error reading CSV: ' + error.message);
      }
    },
  });
}

export function showImportUrlDialog(this: LegacyApp | void): void {
  const legacyApp = this as LegacyApp | undefined;
  const cb = getCallbacks(legacyApp);

  if (legacyApp) {
    legacyApp.importUrlDialogState = {
      url: '',
      isFetching: false,
      error: null,
    };
  } else {
    DialogStore.importUrlState.url.value = '';
    DialogStore.importUrlState.isFetching.value = false;
    DialogStore.importUrlState.error.value = null;
  }

  cb?.openDialog('import-url');
}

export async function fetchAndImportFromUrl(this: LegacyApp | void): Promise<void> {
  const legacyApp = this as LegacyApp | undefined;
  const cb = getCallbacks(legacyApp);
  const { url } = DialogStore.importUrlState;
  const currentUrl = url.value;

  if (!currentUrl || currentUrl.trim() === '') {
    DialogStore.importUrlState.error.value = 'Please enter a valid URL';
    return;
  }

  DialogStore.importUrlState.isFetching.value = true;
  DialogStore.importUrlState.error.value = null;

  try {
    const response = await fetch(currentUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      throw new Error('The URL returned an empty response');
    }

    let fileName = 'Imported Data.csv';
    let fileType = 'text/csv';
    try {
      const urlObj = new URL(currentUrl);
      const pathParts = urlObj.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart) {
        if (lastPart.toLowerCase().endsWith('.json')) {
          fileName = lastPart;
          fileType = 'application/json';
        } else if (
          lastPart.toLowerCase().endsWith('.csv') ||
          lastPart.toLowerCase().endsWith('.tsv') ||
          lastPart.toLowerCase().endsWith('.txt')
        ) {
          fileName = lastPart;
          if (lastPart.toLowerCase().endsWith('.tsv')) {
            fileType = 'text/tab-separated-values';
          }
        }
      }
    } catch (e) {
      // Fallback to default filename
    }

    const file = new File([text], fileName, { type: fileType });

    cb?.closeDialog(true);

    if (legacyApp) {
      legacyApp.showImportDialog(file);
    } else {
      showImportDialog(file);
    }
  } catch (error: any) {
    console.error('URL import error:', error);
    DialogStore.importUrlState.error.value =
      error.message || 'An error occurred while fetching data';
  } finally {
    DialogStore.importUrlState.isFetching.value = false;
  }
}

export function showReplaceSourceDialog(this: LegacyApp | void, source: Source): void {
  DialogStore.importCsvState.isReplaceMode.value = true;
  DialogStore.importCsvState.targetSourceId.value = source.id;
  DialogStore.importCsvState.sourceName.value = source.name;

  const input = document.getElementById('file-input') as HTMLInputElement;
  input?.click();
}

export async function confirmImport(this: LegacyApp | void): Promise<void> {
  const legacyApp = this as LegacyApp | undefined;
  const cb = getCallbacks(legacyApp);

  let headerMode: string;
  let delimiter: string;
  let customHeaders: string[];
  let sourceName: string;
  let isJson: boolean;
  let jsonData: any[] | null;
  let flattenJsonFlag: boolean;
  let serializeNestedFlag: boolean;
  let importFileData: { file: File } | null;

  if (legacyApp) {
    const state = legacyApp.importDialogState;
    headerMode = state.headerMode;
    delimiter = state.delimiter;
    customHeaders = state.customHeaders;
    sourceName = state.sourceName;
    isJson = state.isJson ?? false;
    jsonData = state.jsonData ?? null;
    flattenJsonFlag = state.flattenJson ?? false;
    serializeNestedFlag = state.serializeNested ?? true;
    importFileData = legacyApp.importFileData;
  } else {
    const s = DialogStore.importCsvState;
    headerMode = s.headerMode.value;
    delimiter = s.delimiter.value;
    customHeaders = s.customHeaders.value;
    sourceName = s.sourceName.value;
    isJson = s.isJson.value;
    jsonData = s.jsonData.value;
    flattenJsonFlag = s.flattenJson.value;
    serializeNestedFlag = s.serializeNested.value;
    importFileData = AppStore.importFileData.value;
  }

  if (!importFileData) return;
  const file = importFileData.file;

  if (!sourceName || sourceName.trim() === '') {
    if (legacyApp?.alert) {
      await legacyApp.alert('Please enter a source name');
    } else {
      await alert('Please enter a source name');
    }
    return;
  }

  if (isJson && jsonData) {
    let processedData = jsonData;

    if (flattenJsonFlag) {
      processedData = flattenData(processedData);
    }

    if (serializeNestedFlag) {
      processedData = serializeNestedData(processedData);
    }

    const columns = processedData.length > 0 ? Object.keys(processedData[0]) : customHeaders;

    if (DialogStore.importCsvState.isReplaceMode.value) {
      const sourceId = DialogStore.importCsvState.targetSourceId.value!;
      const schemaDiff = DialogStore.importCsvState.schemaDiff.value;

      const executeReplacement = async () => {
        const fullColumns = SchemaEngine.createPhysicalSchema(processedData);
        await ReplaceSourceService.replaceSource(sourceId, processedData, fullColumns, {
          fileName: file.name,
          headerMode: 'first-row',
          delimiter: ',',
        });

        DialogStore.importCsvState.isReplaceMode.value = false;
        DialogStore.importCsvState.targetSourceId.value = null;
        DialogStore.importCsvState.schemaDiff.value = null;
        cb?.closeDialog();
      };

      if (schemaDiff && schemaDiff.missingColumns.length > 0) {
        const msg = `⚠️ Warning: The new data is missing ${schemaDiff.missingColumns.length} column(s) that exist in the current source:\n\n${schemaDiff.missingColumns.join(', ')}\n\nDependent models may break when recomputed. Are you sure you want to proceed?`;
        const confirmed = legacyApp?.confirm
          ? await legacyApp.confirm(msg, 'Confirm Replacement')
          : await confirm(msg, 'Confirm Replacement');
        if (confirmed) {
          await executeReplacement();
        }
      } else {
        await executeReplacement();
      }
    } else {
      await cb?.createSource(
        file,
        sourceName.trim(),
        columns,
        processedData,
        'first-row',
        ',',
        columns,
        'json'
      );
    }
    return;
  }

  Papa.parse(file, {
    header: false,
    delimiter: delimiter === '\t' ? '\t' : delimiter,
    skipEmptyLines: true,
    dynamicTyping: true,
    complete: async (results) => {
      const rawData = results.data as unknown[][];
      if (!rawData || rawData.length === 0) {
        if (legacyApp?.alert) {
          await legacyApp.alert('Error: CSV file is empty');
        } else {
          await alert('Error: CSV file is empty');
        }
        return;
      }

      let columns: string[], data: DataRow[];
      if (headerMode === 'first-row') {
        columns = customHeaders;
        const dataRows = rawData.slice(1);
        data = dataRows.map((row) => {
          const obj: DataRow = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      } else if (headerMode === 'auto-generate') {
        columns = rawData[0]?.map((_, i) => `Column ${i + 1}`) || [];
        data = rawData.map((row) => {
          const obj: DataRow = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      } else {
        columns = customHeaders;
        data = rawData.map((row) => {
          const obj: DataRow = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
      }

      if (DialogStore.importCsvState.isReplaceMode.value) {
        const sourceId = DialogStore.importCsvState.targetSourceId.value!;
        const schemaDiff = DialogStore.importCsvState.schemaDiff.value;

        const executeReplacement = async () => {
          const fullColumns = SchemaEngine.createPhysicalSchema(data);
          await ReplaceSourceService.replaceSource(sourceId, data, fullColumns, {
            fileName: file.name,
            headerMode,
            delimiter,
          });

          DialogStore.importCsvState.isReplaceMode.value = false;
          DialogStore.importCsvState.targetSourceId.value = null;
          DialogStore.importCsvState.schemaDiff.value = null;
          cb?.closeDialog();
        };

        if (schemaDiff && schemaDiff.missingColumns.length > 0) {
          const msg = `⚠️ Warning: The new data is missing ${schemaDiff.missingColumns.length} column(s) that exist in the current source:\n\n${schemaDiff.missingColumns.join(', ')}\n\nDependent models may break when recomputed. Are you sure you want to proceed?`;
          const confirmed = legacyApp?.confirm
            ? await legacyApp.confirm(msg, 'Confirm Replacement')
            : await confirm(msg, 'Confirm Replacement');
          if (confirmed) {
            await executeReplacement();
          }
        } else {
          await executeReplacement();
        }
        return;
      }

      await cb?.createSource(
        file,
        sourceName.trim(),
        columns,
        data,
        headerMode,
        delimiter,
        customHeaders
      );
    },
    error: async (error) => {
      console.error('CSV parsing error:', error);
      if (legacyApp?.alert) {
        await legacyApp.alert('Error parsing CSV: ' + error.message);
      } else {
        await alert('Error parsing CSV: ' + error.message);
      }
    },
  });
}

export function updateImportPreview(this: LegacyApp | void): void {
  const legacyApp = this as LegacyApp | undefined;

  let importFileData: { file: File } | null;
  let delimiter: string;

  if (legacyApp) {
    importFileData = legacyApp.importFileData;
    delimiter = legacyApp.importDialogState.delimiter;
  } else {
    importFileData = AppStore.importFileData.value;
    delimiter = DialogStore.importCsvState.delimiter.value;
  }

  if (!importFileData) return;
  const file = importFileData.file;

  Papa.parse(file, {
    preview: 5,
    header: false,
    skipEmptyLines: true,
    delimiter: delimiter === '\t' ? '\t' : delimiter,
    complete: (previewResult) => {
      const data = previewResult.data as string[][];
      const firstRow = data[0] || [];
      const newHeaders = firstRow.map((cell, i) => cell || `Column ${i + 1}`);

      if (legacyApp) {
        legacyApp.importDialogState.rawPreviewData = data;
        legacyApp.importDialogState.originalHeaders = newHeaders;
        legacyApp.importDialogState.customHeaders = newHeaders;
        legacyApp.updateHeadersForPreview();
      } else {
        // For store-based, update individual signals
        DialogStore.importCsvState.customHeaders.value = newHeaders;
        updateHeadersForPreview();
      }
    },
    error: async (error) => {
      console.error('CSV preview error:', error);
      if (legacyApp?.alert) {
        await legacyApp.alert('Error parsing CSV with selected delimiter: ' + error.message);
      } else {
        await alert('Error parsing CSV with selected delimiter: ' + error.message);
      }
    },
  });
}

export function updateHeadersForPreview(this: LegacyApp | void): void {
  const legacyApp = this as LegacyApp | undefined;

  let rawPreviewData: string[][];
  let headerMode: string;
  let originalHeaders: string[];
  let customHeaders: string[];
  let isJson: boolean;
  let jsonData: any[] | null;
  let flattenJsonFlag: boolean;
  let serializeNestedFlag: boolean;

  if (legacyApp) {
    const state = legacyApp.importDialogState;
    rawPreviewData = state.rawPreviewData;
    headerMode = state.headerMode;
    originalHeaders = state.originalHeaders;
    customHeaders = state.customHeaders;
    isJson = state.isJson ?? false;
    jsonData = state.jsonData ?? null;
    flattenJsonFlag = state.flattenJson ?? false;
    serializeNestedFlag = state.serializeNested ?? true;
  } else {
    const s = DialogStore.importCsvState;
    // For store-based mode, we don't have rawPreviewData tracked
    // This is a limitation - would need to extend DialogStore
    rawPreviewData = [];
    headerMode = s.headerMode.value;
    originalHeaders = [];
    customHeaders = s.customHeaders.value;
    isJson = s.isJson.value;
    jsonData = s.jsonData.value;
    flattenJsonFlag = s.flattenJson.value;
    serializeNestedFlag = s.serializeNested.value;
  }

  if (isJson && jsonData) {
    const previewLimit = AppStore.uxSettings.value.preview.rowLimit;
    let processedData = jsonData.slice(0, previewLimit);

    if (flattenJsonFlag) {
      processedData = flattenData(processedData);
    }

    if (serializeNestedFlag) {
      processedData = serializeNestedData(processedData);
    }

    const headers = processedData.length > 0 ? Object.keys(processedData[0]) : customHeaders;
    const { resolvedHeaders, warning } = resolveDuplicateHeaders(headers);

    if (legacyApp) {
      legacyApp.importDialogState.previewHeaders = resolvedHeaders;
      legacyApp.importDialogState.previewDataRows = processedData.map((row: any) =>
        resolvedHeaders.map((h) => row[h])
      );
      legacyApp.importDialogState.duplicateWarning = warning;
      legacyApp.importDialogState.customHeaders = resolvedHeaders;
    } else {
      DialogStore.importCsvState.previewHeaders.value = resolvedHeaders;
      DialogStore.importCsvState.previewDataRows.value = processedData.map((row: any) =>
        resolvedHeaders.map((h) => row[h])
      );
      DialogStore.importCsvState.duplicateWarning.value = warning;
      DialogStore.importCsvState.customHeaders.value = resolvedHeaders;
    }
    return;
  }

  if (rawPreviewData.length === 0) {
    if (legacyApp) {
      legacyApp.importDialogState.previewHeaders = [];
      legacyApp.importDialogState.previewDataRows = [];
    } else {
      DialogStore.importCsvState.previewHeaders.value = [];
      DialogStore.importCsvState.previewDataRows.value = [];
    }
    return;
  }

  let headers: string[] | undefined;
  let previewDataRows: any[][];

  if (headerMode === 'first-row') {
    headers = originalHeaders;
    previewDataRows = rawPreviewData.slice(1);
  } else if (headerMode === 'auto-generate') {
    const numCols = rawPreviewData[0]?.length || 0;
    headers = Array.from({ length: numCols }, (_, i) => `Column ${i + 1}`);
    previewDataRows = rawPreviewData;
  } else if (headerMode === 'manual') {
    headers = customHeaders;
    previewDataRows = rawPreviewData;
  } else {
    previewDataRows = rawPreviewData;
  }

  if (legacyApp) {
    legacyApp.importDialogState.previewDataRows = previewDataRows;
  } else {
    DialogStore.importCsvState.previewDataRows.value = previewDataRows;
  }

  if (headers && headers.length > 0) {
    const { resolvedHeaders, warning } = resolveDuplicateHeaders(headers);

    if (legacyApp) {
      legacyApp.importDialogState.previewHeaders = resolvedHeaders;
      legacyApp.importDialogState.duplicateWarning = warning;
      if (headerMode === 'first-row' || headerMode === 'manual') {
        legacyApp.importDialogState.customHeaders = resolvedHeaders;
      }
    } else {
      DialogStore.importCsvState.previewHeaders.value = resolvedHeaders;
      DialogStore.importCsvState.duplicateWarning.value = warning;
      if (headerMode === 'first-row' || headerMode === 'manual') {
        DialogStore.importCsvState.customHeaders.value = resolvedHeaders;
      }
    }
  }

  // Re-compute schema diff if in replace mode
  if (DialogStore.importCsvState.isReplaceMode.value) {
    const sourceId = DialogStore.importCsvState.targetSourceId.value;
    const source = AppStore.sources.value.find((s) => s.id === sourceId);
    if (source) {
      const previewHeaders =
        legacyApp?.importDialogState.previewHeaders ??
        DialogStore.importCsvState.previewHeaders.value;
      const previewRows =
        legacyApp?.importDialogState.previewDataRows ??
        DialogStore.importCsvState.previewDataRows.value;
      computeSchemaDiffForPreview(source.columns, previewHeaders, previewRows);
    }
  }
}
