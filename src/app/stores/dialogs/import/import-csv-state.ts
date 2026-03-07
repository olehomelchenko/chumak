import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { HeaderMode } from '../../../../types/modes';
import type { SchemaDiff } from '../../../../core/schema-engine';

export const importCsvState = {
  fileName: signal(''),
  sourceName: signal(''),
  isJson: signal(false),
  jsonPath: signal(''),
  jsonRawValuePreview: signal(''),
  suggestedJsonKeys: signal<string[]>([]),
  flattenJson: signal(false),
  serializeNested: signal(false),
  jsonData: signal<any>(null),
  fullJsonData: signal<any>(null),
  delimiter: signal(','),
  headerMode: signal<HeaderMode>('first-row'),
  originalHeaders: signal<string[]>([]),
  customHeaders: signal<string[]>([]),
  duplicateWarning: signal(''),
  rawPreviewData: signal<any[][]>([]),
  previewHeaders: signal<string[]>([]),
  previewDataRows: signal<any[][]>([]),
  isReplaceMode: signal(false),
  targetSourceId: signal<string | null>(null),
  schemaDiff: signal<SchemaDiff | null>(null),
  fromUrlImport: signal(false),
  fromTextEntry: signal(false),
};

export function resetImportCsvState() {
  importCsvState.fileName.value = '';
  importCsvState.sourceName.value = '';
  importCsvState.isJson.value = false;
  importCsvState.jsonPath.value = '';
  importCsvState.jsonRawValuePreview.value = '';
  importCsvState.suggestedJsonKeys.value = [];
  importCsvState.flattenJson.value = false;
  importCsvState.serializeNested.value = false;
  importCsvState.jsonData.value = null;
  importCsvState.fullJsonData.value = null;
  importCsvState.delimiter.value = ',';
  importCsvState.headerMode.value = 'first-row';
  importCsvState.originalHeaders.value = [];
  importCsvState.customHeaders.value = [];
  importCsvState.duplicateWarning.value = '';
  importCsvState.rawPreviewData.value = [];
  importCsvState.previewHeaders.value = [];
  importCsvState.previewDataRows.value = [];
  importCsvState.isReplaceMode.value = false;
  importCsvState.targetSourceId.value = null;
  importCsvState.schemaDiff.value = null;
  importCsvState.fromUrlImport.value = false;
  importCsvState.fromTextEntry.value = false;
}

registerResetFunction(resetImportCsvState);
