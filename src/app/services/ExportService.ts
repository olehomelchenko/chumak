import { AppStore } from '../stores/AppStore';
import Papa from 'papaparse';
import { showSuccess } from '../handlers/core/notification-handlers';
import i18n from '../../i18n';
import { isConversionError } from '../../core/type-converter';
import { DependencyService } from './DependencyService';
import { V2Workflow, V2SourceDef, V2ModelDef, translateIdsToNames } from '../../core/workflow-v2';

/**
 * ExportService
 *
 * Handles data and workflow export logic.
 * Replaces logic previously found in export-handlers.ts.
 */
export class ExportService {
  /**
   * Exports the current data as a CSV file
   * @returns The CSV string (for testing purposes), or undefined if no data
   */
  static async exportCSV(alert: (msg: string) => Promise<any>): Promise<string | undefined> {
    const data = AppStore.currentData.value;
    if (!data || data.length === 0) {
      await alert(i18n.t('export.noData', { ns: 'errors' }));
      return undefined;
    }

    const start = performance.now();
    try {
      // Pre-process: convert errors to null, serialize native objects/arrays to JSON strings
      const processedData = data.map((row: Record<string, any>) => {
        const newRow: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          if (isConversionError(value)) {
            newRow[key] = null;
          } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
            newRow[key] = JSON.stringify(value);
          } else {
            newRow[key] = value;
          }
        }
        return newRow;
      });
      const csv = Papa.unparse(processedData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      const modelName = AppStore.activeModel.value ? AppStore.activeModel.value.name : 'export';
      const filename = `${modelName}_${timestamp}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`⚡ Export CSV — ${(performance.now() - start).toFixed(1)}ms — ${filename}`);
      showSuccess(i18n.t('notifications.exported', { ns: 'common', filename }));
      return csv;
    } catch (error: any) {
      console.error('CSV export error:', error);
      await alert(i18n.t('export.csvFailed', { ns: 'errors', message: error.message }));
      return undefined;
    }
  }

  /**
   * Exports the current data as a JSON file
   */
  static async exportDataJSON(alert: (msg: string) => Promise<any>) {
    const data = AppStore.currentData.value;
    if (!data || data.length === 0) {
      await alert(i18n.t('export.noData', { ns: 'errors' }));
      return;
    }

    const start = performance.now();
    try {
      const json = JSON.stringify(
        data,
        (_key, value) => (isConversionError(value) ? null : value),
        2
      );
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      const modelName = AppStore.activeModel.value ? AppStore.activeModel.value.name : 'export';
      const filename = `${modelName}_data_${timestamp}.json`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`⚡ Export JSON — ${(performance.now() - start).toFixed(1)}ms — ${filename}`);
      showSuccess(i18n.t('notifications.exported', { ns: 'common', filename }));
    } catch (error: any) {
      console.error('JSON export error:', error);
      await alert(i18n.t('export.jsonFailed', { ns: 'errors', message: error.message }));
    }
  }

  /**
   * Copies current page data to clipboard as CSV
   */
  static async copyCSVToClipboard(
    getPaginatedData: () => any[],
    alert: (msg: string) => Promise<any>
  ) {
    const pageData = getPaginatedData();
    if (!pageData || pageData.length === 0) {
      await alert(i18n.t('export.noData', { ns: 'errors' }));
      return;
    }

    try {
      const processedData = pageData.map((row: Record<string, any>) => {
        const newRow: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          if (isConversionError(value)) {
            newRow[key] = null;
          } else {
            newRow[key] = value;
          }
        }
        return newRow;
      });
      const csv = Papa.unparse(processedData);
      await navigator.clipboard.writeText(csv);
      showSuccess(i18n.t('notifications.copiedCsv', { ns: 'common', count: pageData.length }));
    } catch (error: any) {
      console.error('Copy to clipboard error:', error);
      await alert(i18n.t('export.clipboardFailed', { ns: 'errors', message: error.message }));
    }
  }

  /**
   * Copies current page data to clipboard as JSON
   */
  static async copyJSONToClipboard(
    getPaginatedData: () => any[],
    alert: (msg: string) => Promise<any>
  ) {
    const pageData = getPaginatedData();
    if (!pageData || pageData.length === 0) {
      await alert(i18n.t('export.noData', { ns: 'errors' }));
      return;
    }

    try {
      const json = JSON.stringify(
        pageData,
        (_key, value) => (isConversionError(value) ? null : value),
        2
      );
      await navigator.clipboard.writeText(json);
      showSuccess(i18n.t('notifications.copiedJson', { ns: 'common', count: pageData.length }));
    } catch (error: any) {
      console.error('Copy to clipboard error:', error);
      await alert(i18n.t('export.clipboardFailed', { ns: 'errors', message: error.message }));
    }
  }

  /**
   * Exports a workflow in v2 format (portable, name-based references).
   * Walks upstream from the active model to collect all referenced models and sources.
   */
  static async exportWorkflowV2(alert: (msg: string) => Promise<any>) {
    const activeModel = AppStore.activeModel.value;
    if (!activeModel) {
      await alert(i18n.t('export.noWorkflow', { ns: 'errors' }));
      return;
    }

    try {
      const sources = AppStore.sources.value;
      const models = AppStore.models.value;

      // Build dependency graph and walk upstream from active model
      const graph = DependencyService.buildGraph(sources, models);
      const upstream = DependencyService.getUpstreamDependencies(graph, [activeModel.id]);

      // Build ID → name maps
      // Sources: plain name. Models: sourceName/modelName composite key.
      const idToName = new Map<string, string>();
      for (const src of sources) {
        if (upstream.has(src.id)) {
          idToName.set(src.id, src.name);
        }
      }
      for (const mdl of models) {
        if (upstream.has(mdl.id)) {
          const rootSourceId = DependencyService.getRootSourceId(models, sources, mdl.id);
          const rootSource = rootSourceId ? sources.find((s) => s.id === rootSourceId) : null;
          const prefix = rootSource ? rootSource.name : idToName.get(mdl.sourceId) || mdl.sourceId;
          idToName.set(mdl.id, `${prefix}/${mdl.name}`);
        }
      }

      // Build v2 sources
      const v2Sources: Record<string, V2SourceDef> = {};
      for (const src of sources) {
        if (!upstream.has(src.id)) continue;
        const name = idToName.get(src.id)!;
        const def: V2SourceDef = {
          columns: JSON.parse(JSON.stringify(src.columns)),
        };
        // Add parsing hints if available
        if (src.delimiter || src.headerMode) {
          def.parsing = {
            format: 'csv',
            delimiter: src.delimiter || ',',
            headerMode: src.headerMode || 'first-row',
            encoding: 'utf-8',
          };
          if (src.customHeaders) {
            def.parsing.customHeaders = src.customHeaders;
          }
        }
        v2Sources[name] = def;
      }

      // Build v2 models
      const v2Models: Record<string, V2ModelDef> = {};
      for (const mdl of models) {
        if (!upstream.has(mdl.id)) continue;
        const name = idToName.get(mdl.id)!;
        const sourceName = idToName.get(mdl.sourceId) || mdl.sourceId;

        // Clone steps, strip import steps, translate IDs to names
        const cleanedSteps = mdl.steps.filter((s) => !s.import);
        const translatedSteps = translateIdsToNames(cleanedSteps, idToName);

        v2Models[name] = {
          source: sourceName,
          steps: translatedSteps,
        };
      }

      const workflow: V2Workflow = {
        formatVersion: 2,
        sytoVersion: __APP_VERSION__,
        exportedAt: new Date().toISOString(),
        sources: v2Sources,
        models: v2Models,
        outputs: [idToName.get(activeModel.id)!],
      };

      const json = JSON.stringify(workflow, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${activeModel.name}_workflow_${timestamp}.json`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('Exported workflow v2 JSON:', filename);
      showSuccess(i18n.t('notifications.exportedWorkflow', { ns: 'common', filename }));
    } catch (error: any) {
      console.error('Workflow v2 export error:', error);
      await alert(i18n.t('export.workflowFailed', { ns: 'errors', message: error.message }));
    }
  }
}
