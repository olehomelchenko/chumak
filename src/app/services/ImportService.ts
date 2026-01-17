import { AppStore } from '../stores/AppStore';
import { Source, Model } from '../types';
import { SchemaEngine } from '../../core/schema-engine';
import { PersistenceService } from './PersistenceService';

/**
 * ImportService
 *
 * Handles data import logic and updates the AppStore.
 * Replaces logic previously found in import-handlers.ts.
 */
export class ImportService {
  /**
   * Finalizes the import process and creates a new source and model
   */
  static async createSource(
    file: File,
    sourceName: string,
    columns: string[],
    data: any[],
    headerMode: string,
    delimiter: string,
    customHeaders: string[] | null = null,
    origin = 'file',
    updatePagination: () => void,
    closeDialog: (force?: boolean) => void
  ) {
    const start = performance.now();

    // Validation
    if (columns.some((c) => !c || c.trim() === '')) {
      throw new Error('Column names cannot be empty.');
    }

    const cleanData = JSON.parse(JSON.stringify(data));

    const source: Source = {
      id: `src_${Date.now()}`,
      name: sourceName,
      fileName: file.name,
      origin: origin,
      delimiter: delimiter,
      headerMode: headerMode as 'first-row' | 'auto-generate' | 'manual',
      customHeaders: customHeaders || null,
      rawSize: file.size,
      rowCount: cleanData.length,
      columns: SchemaEngine.createInitialSchema(cleanData),
      createdAt: new Date().toISOString(),
      data: cleanData,
      __v: 1,
    };

    AppStore.sources.value = [...AppStore.sources.value, source];

    const mainModel: Model = {
      id: `mdl_${Date.now()}`,
      name: 'main',
      sourceId: source.id,
      steps: [],
      schema: JSON.parse(JSON.stringify(source.columns)),
      data: cleanData,
      __v: 1,
    };

    // Initial Import Step
    const importStep = {
      import: {
        source: sourceName,
        fileName: file.name,
        delimiter: delimiter,
        headerMode: headerMode,
      },
    } as any;
    if (headerMode === 'manual' && customHeaders) importStep.import.customHeaders = customHeaders;
    mainModel.steps.push(importStep);

    // Initial Types Step
    const typesStep = { types: {} as any };
    source.columns.forEach((col: any) => {
      typesStep.types[col.name] = col.type;
    });
    mainModel.steps.push(typesStep);

    AppStore.models.value = [...AppStore.models.value, mainModel];

    // Update active state
    AppStore.activeModel.value = mainModel;
    AppStore.currentData.value = cleanData;
    AppStore.columns.value = columns;
    AppStore.viewMode.value = 'model';
    AppStore.activeStepIndex.value = mainModel.steps.length - 1;
    AppStore.viewingIntermediate.value = false;

    updatePagination();
    await PersistenceService.autoSave();

    console.log(
      `⚡ Import ${origin.toUpperCase()} — ${(performance.now() - start).toFixed(1)}ms — ${
        file.name
      } (${(file.size / 1024).toFixed(1)} KB)`
    );

    closeDialog(true);
  }
}
