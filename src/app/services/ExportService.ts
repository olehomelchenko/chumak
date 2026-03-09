import { AppStore } from '../stores/AppStore';
import Papa from 'papaparse';
import { showSuccess } from '../handlers/core/notification-handlers';
import i18n from '../../i18n';
import { isConversionError } from '../../core/type-converter';

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
   * Exports the current model workflow as JSON
   */
  static async exportWorkflowJSON(alert: (msg: string) => Promise<any>) {
    const activeModel = AppStore.activeModel.value;
    if (!activeModel) {
      await alert(i18n.t('export.noWorkflow', { ns: 'errors' }));
      return;
    }

    try {
      const source = AppStore.sources.value.find((s) => s.id === activeModel.sourceId);
      const workflow = {
        formatVersion: 1,
        sytoVersion: __APP_VERSION__,
        name: activeModel.name,
        exportedAt: new Date().toISOString(),
        source: {
          id: source?.id,
          name: source?.name,
          columns: source?.columns,
        },
        model: {
          id: activeModel.id,
          name: activeModel.name,
          steps: activeModel.steps,
        },
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

      console.log('Exported workflow JSON:', filename);
      showSuccess(i18n.t('notifications.exportedWorkflow', { ns: 'common', filename }));
    } catch (error: any) {
      console.error('Workflow export error:', error);
      await alert(i18n.t('export.workflowFailed', { ns: 'errors', message: error.message }));
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
      showSuccess(i18n.t('notifications.copiedCsv', { ns: 'common' }));
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
      showSuccess(i18n.t('notifications.copiedJson', { ns: 'common' }));
    } catch (error: any) {
      console.error('Copy to clipboard error:', error);
      await alert(i18n.t('export.clipboardFailed', { ns: 'errors', message: error.message }));
    }
  }
}
