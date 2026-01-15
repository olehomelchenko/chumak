import type { ChumakApp } from '../../chumak-app';
import type { DataRow } from '../types';
import Papa from 'papaparse';
import { DialogStore } from '../stores/DialogStore';

export function handleFileSelect(this: ChumakApp, event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  this.showImportDialog(file);
  target.value = '';
}

export async function handleFileDrop(this: ChumakApp, event: DragEvent) {
  this.isDragging = false;
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  const file = files[0];
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.csv') && !fileName.endsWith('.json')) {
    await this.alert('Please drop a CSV or JSON file');
    return;
  }
  this.showImportDialog(file);
}

export async function handlePaste(this: ChumakApp, event: ClipboardEvent) {
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
      this.showImportDialog(file);
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
    this.showImportDialog(file);
  }
}

export async function promptPaste(this: ChumakApp) {
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
        this.showImportDialog(file);
      } else {
        await this.alert(
          'Clipboard is empty or does not contain text. Try copying some CSV or JSON data first.'
        );
      }
    } else {
      await this.alert(
        'Your browser does not support direct clipboard access. Please use Ctrl+V to paste data.'
      );
    }
  } catch (err) {
    console.warn('Clipboard access denied:', err);
    await this.alert('Please press Ctrl+V to paste your data directly.');
  }
}

export function showImportDialog(this: ChumakApp, file: File) {
  this.importFileData = { file };
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.json')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        this.handleJsonPreview(file, data);
      } catch (err) {
        this.handleCsvPreview(file);
      }
    };
    reader.readAsText(file);
  } else {
    this.handleCsvPreview(file);
  }
}

export function handleJsonPreview(this: ChumakApp, file: File, data: any, path = '') {
  const defaultName = file.name.replace(/\.json$/i, '');
  let resolvedData = data;

  if (path) {
    resolvedData = this.resolvePath(data, path);
  }

  const isValidArray =
    Array.isArray(resolvedData) &&
    resolvedData.length > 0 &&
    typeof resolvedData[0] === 'object' &&
    resolvedData[0] !== null;

  const previewData = isValidArray ? resolvedData.slice(0, 5) : [];
  const headers = isValidArray ? Object.keys(previewData[0]) : [];

  this.importDialogState = {
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
    suggestedJsonKeys: this.getSuggestedKeys(resolvedData),
    flattenJson: this.importDialogState.flattenJson ?? false,
    serializeNested: this.importDialogState.serializeNested ?? true,
  };
  this.openDialog('import-csv');
}

export function updateJsonPath(this: ChumakApp) {
  const { fullJsonData, jsonPath, fileName } = this.importDialogState;
  if (!fullJsonData) return;

  // We reuse handleJsonPreview but with the new path
  const fileMock = { name: fileName } as any;
  this.handleJsonPreview(fileMock, fullJsonData, jsonPath);
}

export function resolvePath(this: ChumakApp, obj: any, path: string) {
  if (!path) return obj;
  try {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      // Handle array indices
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

export function getSuggestedKeys(this: ChumakApp, obj: any): string[] {
  if (obj === null || typeof obj !== 'object') return [];
  if (Array.isArray(obj)) {
    // If it's an array, we could suggest indices or keys of the first element
    if (obj.length > 0) {
      return ['0', ...Object.keys(obj[0] || {})];
    }
    return [];
  }
  return Object.keys(obj);
}

export function selectJsonPathSegment(this: ChumakApp, segment: string) {
  const currentPath = this.importDialogState.jsonPath;
  const newPath = currentPath ? `${currentPath}.${segment}` : segment;
  this.importDialogState.jsonPath = newPath;
  this.updateJsonPath();
}

export function resetJsonPath(this: ChumakApp) {
  this.importDialogState.jsonPath = '';
  this.updateJsonPath();
}

export function flattenData(this: ChumakApp, data: any[]): any[] {
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

export function serializeNestedData(this: ChumakApp, data: any[]): any[] {
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

export function handleCsvPreview(this: ChumakApp, file: File) {
  Papa.parse(file, {
    preview: 5,
    header: false,
    skipEmptyLines: true,
    complete: (previewResult) => {
      const data = previewResult.data as string[][];
      const firstRow = data[0] || [];
      const defaultName = file.name.replace(/\.csv$/i, '');
      const initialHeaders = firstRow.map((cell, i) => cell || `Column ${i + 1}`);
      this.importDialogState = {
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
      this.updateHeadersForPreview();
      this.openDialog('import-csv');
    },
    error: async (error) => {
      console.error('CSV preview error:', error);
      await this.alert('Error reading CSV: ' + error.message);
    },
  });
}

export function showImportUrlDialog(this: ChumakApp) {
  this.importUrlDialogState = {
    url: '',
    isFetching: false,
    error: null,
  };
  this.openDialog('import-url');
}

export async function fetchAndImportFromUrl(this: ChumakApp) {
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

    // Extract filename from URL or use a default
    let fileName = 'Imported Data.csv';
    try {
      const urlObj = new URL(currentUrl);
      const pathParts = urlObj.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart) {
        if (lastPart.toLowerCase().endsWith('.json')) {
          fileName = lastPart;
        } else if (
          lastPart.toLowerCase().endsWith('.csv') ||
          lastPart.toLowerCase().endsWith('.tsv') ||
          lastPart.toLowerCase().endsWith('.txt')
        ) {
          fileName = lastPart;
        }
      }
    } catch (e) {
      // Fallback to default filename
    }

    const file = new File([text], fileName, { type: 'text/csv' });

    // Close URL dialog and show the standard import dialog
    this.closeDialog(true); // Close current (force close without unsaved changes prompt)

    // We need to call showImportDialog.
    // Since we are in the same module, we can call it if we make it standalone too?
    // Or we can import usage from the class context if we weren't removing `this`.
    // But showImportDialog is currently `export function showImportDialog(this: ChumakApp...`
    // We need to decouple showImportDialog as well.
    // For now, let's assume showImportDialog is refactored below or we call a refactored version.

    // Calling the standalone version (assuming we refactor it next)
    this.showImportDialog(file);
  } catch (error: any) {
    console.error('URL import error:', error);
    DialogStore.importUrlState.error.value =
      error.message || 'An error occurred while fetching data';
  } finally {
    DialogStore.importUrlState.isFetching.value = false;
  }
}

export async function confirmImport(this: ChumakApp) {
  const {
    headerMode,
    delimiter,
    customHeaders,
    sourceName,
    isJson,
    jsonData,
    flattenJson,
    serializeNested,
  } = this.importDialogState;
  if (!this.importFileData) return;
  const file = this.importFileData.file;
  if (!sourceName || sourceName.trim() === '') {
    await this.alert('Please enter a source name');
    return;
  }

  if (isJson && jsonData) {
    let processedData = jsonData;

    if (flattenJson) {
      processedData = this.flattenData(processedData);
    }

    if (serializeNested) {
      processedData = this.serializeNestedData(processedData);
    }

    const columns = processedData.length > 0 ? Object.keys(processedData[0]) : customHeaders;

    this.createSource(
      file,
      sourceName.trim(),
      columns,
      processedData,
      'first-row',
      ',',
      columns,
      'json'
    );
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
        await this.alert('Error: CSV file is empty');
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
        await this.createSource(
          file,
          sourceName.trim(),
          columns,
          data,
          headerMode,
          delimiter,
          customHeaders
        );
      } else if (headerMode === 'auto-generate') {
        columns = rawData[0]?.map((_, i) => `Column ${i + 1}`) || [];
        data = rawData.map((row) => {
          const obj: DataRow = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
        await this.createSource(file, sourceName.trim(), columns, data, headerMode, delimiter);
      } else if (headerMode === 'manual') {
        columns = customHeaders;
        data = rawData.map((row) => {
          const obj: DataRow = {};
          columns.forEach((col, i) => {
            obj[col] = row[i];
          });
          return obj;
        });
        await this.createSource(
          file,
          sourceName.trim(),
          columns,
          data,
          headerMode,
          delimiter,
          customHeaders
        );
      }
    },
    error: async (error) => {
      console.error('CSV parsing error:', error);
      await this.alert('Error parsing CSV: ' + error.message);
    },
  });
}

export function updateImportPreview(this: ChumakApp) {
  if (!this.importFileData) return;
  const file = this.importFileData.file;
  const delimiter = this.importDialogState.delimiter;
  Papa.parse(file, {
    preview: 5,
    header: false,
    skipEmptyLines: true,
    delimiter: delimiter === '\t' ? '\t' : delimiter,
    complete: (previewResult) => {
      const data = previewResult.data as string[][];
      const firstRow = data[0] || [];
      this.importDialogState.rawPreviewData = data;
      const newHeaders = firstRow.map((cell, i) => cell || `Column ${i + 1}`);
      this.importDialogState.originalHeaders = newHeaders;
      this.importDialogState.customHeaders = newHeaders;
      this.updateHeadersForPreview();
    },
    error: async (error) => {
      console.error('CSV preview error:', error);
      await this.alert('Error parsing CSV with selected delimiter: ' + error.message);
    },
  });
}

export function updateHeadersForPreview(this: ChumakApp) {
  const {
    rawPreviewData,
    headerMode,
    originalHeaders,
    customHeaders,
    isJson,
    jsonData,
    flattenJson,
    serializeNested,
  } = this.importDialogState;

  if (isJson && jsonData) {
    let processedData = jsonData.slice(0, 5);

    if (flattenJson) {
      processedData = this.flattenData(processedData);
    }

    if (serializeNested) {
      processedData = this.serializeNestedData(processedData);
    }

    const headers = processedData.length > 0 ? Object.keys(processedData[0]) : customHeaders;
    const { resolvedHeaders, warning } = this.resolveDuplicateHeaders(headers);

    this.importDialogState.previewHeaders = resolvedHeaders;
    this.importDialogState.previewDataRows = processedData.map((row: any) =>
      resolvedHeaders.map((h) => row[h])
    );
    this.importDialogState.duplicateWarning = warning;
    this.importDialogState.customHeaders = resolvedHeaders;
    return;
  }

  if (rawPreviewData.length === 0) {
    this.importDialogState.previewHeaders = [];
    this.importDialogState.previewDataRows = [];
    return;
  }
  let headers;
  if (headerMode === 'first-row') {
    headers = originalHeaders;
    this.importDialogState.previewDataRows = rawPreviewData.slice(1);
  } else if (headerMode === 'auto-generate') {
    const numCols = rawPreviewData[0]?.length || 0;
    headers = Array.from({ length: numCols }, (_, i) => `Column ${i + 1}`);
    this.importDialogState.previewDataRows = rawPreviewData;
  } else if (headerMode === 'manual') {
    headers = customHeaders;
    this.importDialogState.previewDataRows = rawPreviewData;
  }
  if (headers && headers.length > 0) {
    const { resolvedHeaders, warning } = this.resolveDuplicateHeaders(headers);
    this.importDialogState.previewHeaders = resolvedHeaders;
    this.importDialogState.duplicateWarning = warning;
    if (headerMode === 'first-row' || headerMode === 'manual') {
      this.importDialogState.customHeaders = resolvedHeaders;
    }
  }
}

export function resolveDuplicateHeaders(this: ChumakApp, headers: string[]) {
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
