import type { DataRow } from '../../types';
import Papa from 'papaparse';
import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { Source } from '../../types';
import { SchemaEngine, ColumnSchema } from '../../../core/schema-engine';
import { ReplaceSourceService } from '../../services/ReplaceSourceService';
import { alert, confirm } from '../core/notification-handlers';
import i18n from '../../../i18n';

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

export function handleFileSelect(event: Event): void {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  showImportDialog(file);
  target.value = '';
}

export async function handleFileDrop(event: DragEvent): Promise<void> {
  AppStore.isDragging.value = false;

  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  const file = files[0];
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.csv') && !fileName.endsWith('.json')) {
    await alert(i18n.t('import.dropFile', { ns: 'errors' }));
    return;
  }

  showImportDialog(file);
}

export async function handlePaste(event: ClipboardEvent): Promise<void> {
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
      showImportDialog(file);
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
    showImportDialog(file);
  }
}

export async function promptPaste(): Promise<void> {
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
        showImportDialog(file);
      } else {
        await alert(i18n.t('import.clipboardEmpty', { ns: 'errors' }));
      }
    } else {
      await alert(i18n.t('import.clipboardNotSupported', { ns: 'errors' }));
    }
  } catch (err) {
    console.warn('Clipboard access denied:', err);
    await alert(i18n.t('import.pastePrompt', { ns: 'errors' }));
  }
}

// ============================================================================
// Import Dialog Functions
// ============================================================================

export function showImportDialog(file: File): void {
  AppStore.importFileData.value = { file };

  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.json')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        handleJsonPreview(file, data);
      } catch (err) {
        handleCsvPreview(file);
      }
    };
    reader.readAsText(file);
  } else {
    handleCsvPreview(file);
  }
}

export function handleJsonPreview(file: File, data: any, path = ''): void {
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

  // Get previous flatten/serialize state from store
  const s = DialogStore.importCsvState;
  const prevFlatten = s.flattenJson.value;
  const prevSerialize = s.serializeNested.value;

  // Update DialogStore signals
  s.fileName.value = file.name;
  s.sourceName.value = defaultName;
  s.isJson.value = true;
  s.jsonPath.value = path;
  s.jsonRawValuePreview.value = resolvedData
    ? JSON.stringify(resolvedData, null, 2).slice(0, 1000)
    : '';
  s.suggestedJsonKeys.value = getSuggestedKeys(resolvedData);
  s.flattenJson.value = prevFlatten;
  s.serializeNested.value = prevSerialize !== false; // Default to true
  s.jsonData.value = isValidArray ? resolvedData : null;
  s.fullJsonData.value = data;
  s.delimiter.value = ',';
  s.headerMode.value = 'first-row';
  s.originalHeaders.value = headers;
  s.customHeaders.value = [...headers];
  s.duplicateWarning.value = '';
  s.previewHeaders.value = headers;
  s.previewDataRows.value = previewData.map((row: any) => headers.map((h) => row[h]));

  // If in replace mode, compute schema diff
  if (s.isReplaceMode.value) {
    const sourceId = s.targetSourceId.value;
    const source = AppStore.sources.value.find((src) => src.id === sourceId);
    if (source) {
      computeSchemaDiffForPreview(source.columns, headers, previewData);
    }
  }

  callbacks?.openDialog('import-csv');
}

export function updateJsonPath(): void {
  const s = DialogStore.importCsvState;
  const fullJsonData = s.fullJsonData.value;
  const jsonPath = s.jsonPath.value;
  const fileName = s.fileName.value;

  if (!fullJsonData) return;

  const fileMock = { name: fileName } as File;
  handleJsonPreview(fileMock, fullJsonData, jsonPath);
}

export function selectJsonPathSegment(segment: string): void {
  const currentPath = DialogStore.importCsvState.jsonPath.value;
  const newPath = currentPath ? `${currentPath}.${segment}` : segment;
  DialogStore.importCsvState.jsonPath.value = newPath;
  updateJsonPath();
}

export function resetJsonPath(): void {
  DialogStore.importCsvState.jsonPath.value = '';
  updateJsonPath();
}

export function handleCsvPreview(file: File): void {
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

      const s = DialogStore.importCsvState;
      s.fileName.value = file.name;
      s.sourceName.value = defaultName;
      s.isJson.value = false;
      s.delimiter.value = previewResult.meta.delimiter || ',';
      s.headerMode.value = 'first-row';
      s.originalHeaders.value = initialHeaders;
      s.customHeaders.value = initialHeaders;
      s.rawPreviewData.value = data;
      s.duplicateWarning.value = '';
      s.jsonData.value = null;
      s.fullJsonData.value = null;

      updateHeadersForPreview();

      // If in replace mode, compute schema diff
      if (s.isReplaceMode.value) {
        const sourceId = s.targetSourceId.value;
        const source = AppStore.sources.value.find((src) => src.id === sourceId);
        if (source) {
          computeSchemaDiffForPreview(
            source.columns,
            s.previewHeaders.value,
            s.previewDataRows.value
          );
        }
      }

      callbacks?.openDialog('import-csv');
    },
    error: async (error) => {
      console.error('CSV preview error:', error);
      await alert(i18n.t('import.csvError', { ns: 'errors', message: error.message }));
    },
  });
}

export function showImportUrlDialog(): void {
  DialogStore.importUrlState.url.value = '';
  DialogStore.importUrlState.isFetching.value = false;
  DialogStore.importUrlState.error.value = null;

  callbacks?.openDialog('import-url');
}

export async function fetchAndImportFromUrl(): Promise<void> {
  const { url } = DialogStore.importUrlState;
  const currentUrl = url.value;

  if (!currentUrl || currentUrl.trim() === '') {
    DialogStore.importUrlState.error.value = i18n.t('validation.required.url', { ns: 'errors' });
    return;
  }

  DialogStore.importUrlState.isFetching.value = true;
  DialogStore.importUrlState.error.value = null;

  try {
    const response = await fetch(currentUrl);
    if (!response.ok) {
      throw new Error(
        i18n.t('import.fetchError', {
          ns: 'errors',
          status: `${response.status} ${response.statusText}`,
        })
      );
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      throw new Error(i18n.t('import.emptyResponse', { ns: 'errors' }));
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

    // Transition from import-url to import-csv without resetAll()
    // (closeDialog resets all dialog state, which would clear fromUrlImport)
    AppStore.activeDialog.value = null;
    AppStore.dialogSnapshot.value = null;
    DialogStore.importCsvState.fromUrlImport.value = true;
    showImportDialog(file);
  } catch (error: any) {
    console.error('URL import error:', error);
    DialogStore.importUrlState.error.value =
      error.message || i18n.t('import.fetchGenericError', { ns: 'errors' });
  } finally {
    DialogStore.importUrlState.isFetching.value = false;
  }
}

export function backToUrlImport(): void {
  const savedUrl = DialogStore.importUrlState.url.value;
  DialogStore.importCsvState.fromUrlImport.value = false;
  callbacks?.closeDialog(true);
  // Restore URL after closeDialog reset, then reopen import-url dialog
  DialogStore.importUrlState.url.value = savedUrl;
  callbacks?.openDialog('import-url');
}

export function confirmTextEntry(): void {
  const { text, isEditMode, targetSourceId } = DialogStore.importTextState;
  const rawText = text.value;

  if (!rawText || rawText.trim().length === 0) return;

  const trimmed = rawText.trim();
  const isLikelyJson =
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}'));
  const file = new File([rawText], isLikelyJson ? 'Entered Data.json' : 'Entered Data.csv', {
    type: isLikelyJson ? 'application/json' : 'text/csv',
  });

  // Transition from import-text to import-csv without full resetAll
  AppStore.activeDialog.value = null;
  AppStore.dialogSnapshot.value = null;
  DialogStore.importCsvState.fromTextEntry.value = true;

  // If editing an existing source, set replace mode
  if (isEditMode.value && targetSourceId.value) {
    DialogStore.importCsvState.isReplaceMode.value = true;
    DialogStore.importCsvState.targetSourceId.value = targetSourceId.value;
    const source = AppStore.sources.value.find((s) => s.id === targetSourceId.value);
    if (source) {
      DialogStore.importCsvState.sourceName.value = source.name;
    }
  }

  showImportDialog(file);
}

export function showEditTextDialog(source: Source): void {
  if (!source.rawText) return;

  DialogStore.importTextState.text.value = source.rawText;
  DialogStore.importTextState.isEditMode.value = true;
  DialogStore.importTextState.targetSourceId.value = source.id;

  callbacks?.openDialog('import-text');
}

export function backToTextEntry(): void {
  const savedText = DialogStore.importTextState.text.value;
  const savedIsEditMode = DialogStore.importTextState.isEditMode.value;
  const savedTargetSourceId = DialogStore.importTextState.targetSourceId.value;

  DialogStore.importCsvState.fromTextEntry.value = false;
  callbacks?.closeDialog(true);

  // Restore text state after closeDialog reset, then reopen import-text dialog
  DialogStore.importTextState.text.value = savedText;
  DialogStore.importTextState.isEditMode.value = savedIsEditMode;
  DialogStore.importTextState.targetSourceId.value = savedTargetSourceId;
  callbacks?.openDialog('import-text');
}

export function showReplaceSourceDialog(source: Source): void {
  DialogStore.importCsvState.isReplaceMode.value = true;
  DialogStore.importCsvState.targetSourceId.value = source.id;
  DialogStore.importCsvState.sourceName.value = source.name;

  const input = document.getElementById('file-input') as HTMLInputElement;
  input?.click();
}

/**
 * After source creation/replacement via text entry, store the raw text on the source
 * so the user can later re-edit it.
 */
function setRawTextIfTextEntry(): void {
  if (!DialogStore.importCsvState.fromTextEntry.value) return;
  const rawText = DialogStore.importTextState.text.value;
  if (!rawText) return;

  // For new sources: the last source added is the one just created
  const sources = AppStore.sources.value;
  const source = sources[sources.length - 1];
  if (source) {
    source.rawText = rawText;
    AppStore.sources.value = [...sources];
  }
}

function setRawTextOnReplacedSource(sourceId: string): void {
  if (!DialogStore.importCsvState.fromTextEntry.value) return;
  const rawText = DialogStore.importTextState.text.value;
  if (!rawText) return;

  const source = AppStore.sources.value.find((s) => s.id === sourceId);
  if (source) {
    source.rawText = rawText;
    AppStore.sources.value = [...AppStore.sources.value];
  }
}

export async function confirmImport(): Promise<void> {
  const s = DialogStore.importCsvState;
  const headerMode = s.headerMode.value;
  const delimiter = s.delimiter.value;
  const customHeaders = s.customHeaders.value;
  const sourceName = s.sourceName.value;
  const isJson = s.isJson.value;
  const jsonData = s.jsonData.value;
  const flattenJsonFlag = s.flattenJson.value;
  const serializeNestedFlag = s.serializeNested.value;
  const importFileData = AppStore.importFileData.value;

  if (!importFileData) return;
  const file = importFileData.file;

  if (!sourceName || sourceName.trim() === '') {
    await alert(i18n.t('validation.required.sourceName', { ns: 'errors' }));
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

    if (s.isReplaceMode.value) {
      const sourceId = s.targetSourceId.value!;
      const schemaDiff = s.schemaDiff.value;

      const executeReplacement = async () => {
        const fullColumns = SchemaEngine.createPhysicalSchema(processedData);
        await ReplaceSourceService.replaceSource(sourceId, processedData, fullColumns, {
          fileName: file.name,
          headerMode: 'first-row',
          delimiter: ',',
        });

        setRawTextOnReplacedSource(sourceId);
        s.isReplaceMode.value = false;
        s.targetSourceId.value = null;
        s.schemaDiff.value = null;
        callbacks?.closeDialog();
      };

      if (schemaDiff && schemaDiff.missingColumns.length > 0) {
        const msg = i18n.t('confirms.schemaDiffWarning', {
          ns: 'common',
          count: schemaDiff.missingColumns.length,
          columns: schemaDiff.missingColumns.join(', '),
        });
        const confirmed = await confirm(
          msg,
          i18n.t('confirms.confirmReplacement', { ns: 'common' })
        );
        if (confirmed) {
          await executeReplacement();
        }
      } else {
        await executeReplacement();
      }
    } else {
      await callbacks?.createSource(
        file,
        sourceName.trim(),
        columns,
        processedData,
        'first-row',
        ',',
        columns,
        'json'
      );
      setRawTextIfTextEntry();
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
        await alert(i18n.t('import.csvError', { ns: 'errors', message: 'CSV file is empty' }));
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

      if (s.isReplaceMode.value) {
        const sourceId = s.targetSourceId.value!;
        const schemaDiff = s.schemaDiff.value;

        const executeReplacement = async () => {
          const fullColumns = SchemaEngine.createPhysicalSchema(data);
          await ReplaceSourceService.replaceSource(sourceId, data, fullColumns, {
            fileName: file.name,
            headerMode,
            delimiter,
          });

          setRawTextOnReplacedSource(sourceId);
          s.isReplaceMode.value = false;
          s.targetSourceId.value = null;
          s.schemaDiff.value = null;
          callbacks?.closeDialog();
        };

        if (schemaDiff && schemaDiff.missingColumns.length > 0) {
          const msg = i18n.t('confirms.schemaDiffWarning', {
            ns: 'common',
            count: schemaDiff.missingColumns.length,
            columns: schemaDiff.missingColumns.join(', '),
          });
          const confirmed = await confirm(
            msg,
            i18n.t('confirms.confirmReplacement', { ns: 'common' })
          );
          if (confirmed) {
            await executeReplacement();
          }
        } else {
          await executeReplacement();
        }
        return;
      }

      await callbacks?.createSource(
        file,
        sourceName.trim(),
        columns,
        data,
        headerMode,
        delimiter,
        customHeaders
      );
      setRawTextIfTextEntry();
    },
    error: async (error) => {
      console.error('CSV parsing error:', error);
      await alert(i18n.t('import.csvError', { ns: 'errors', message: error.message }));
    },
  });
}

export function updateImportPreview(): void {
  const importFileData = AppStore.importFileData.value;
  const delimiter = DialogStore.importCsvState.delimiter.value;

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

      const s = DialogStore.importCsvState;
      s.rawPreviewData.value = data;
      s.originalHeaders.value = newHeaders;
      s.customHeaders.value = newHeaders;
      updateHeadersForPreview();
    },
    error: async (error) => {
      console.error('CSV preview error:', error);
      await alert(i18n.t('import.csvError', { ns: 'errors', message: error.message }));
    },
  });
}

export function updateHeadersForPreview(): void {
  const s = DialogStore.importCsvState;
  const rawPreviewData = s.rawPreviewData.value;
  const headerMode = s.headerMode.value;
  const originalHeaders = s.originalHeaders.value;
  const customHeaders = s.customHeaders.value;
  const isJson = s.isJson.value;
  const jsonData = s.jsonData.value;
  const flattenJsonFlag = s.flattenJson.value;
  const serializeNestedFlag = s.serializeNested.value;

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

    s.previewHeaders.value = resolvedHeaders;
    s.previewDataRows.value = processedData.map((row: any) => resolvedHeaders.map((h) => row[h]));
    s.duplicateWarning.value = warning;
    s.customHeaders.value = resolvedHeaders;
    return;
  }

  if (rawPreviewData.length === 0) {
    s.previewHeaders.value = [];
    s.previewDataRows.value = [];
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

  s.previewDataRows.value = previewDataRows;

  if (headers && headers.length > 0) {
    const { resolvedHeaders, warning } = resolveDuplicateHeaders(headers);

    s.previewHeaders.value = resolvedHeaders;
    s.duplicateWarning.value = warning;
    if (headerMode === 'first-row' || headerMode === 'manual') {
      s.customHeaders.value = resolvedHeaders;
    }
  }

  // Re-compute schema diff if in replace mode
  if (s.isReplaceMode.value) {
    const sourceId = s.targetSourceId.value;
    const source = AppStore.sources.value.find((src) => src.id === sourceId);
    if (source) {
      computeSchemaDiffForPreview(source.columns, s.previewHeaders.value, s.previewDataRows.value);
    }
  }
}
