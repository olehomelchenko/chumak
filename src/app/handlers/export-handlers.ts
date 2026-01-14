import type { ChumakApp } from '../../chumak-app';
import Papa from 'papaparse';

export async function exportCSV(this: ChumakApp) {
  if (!this.currentData || this.currentData.length === 0) {
    await this.alert('No data to export');
    return;
  }

  const start = performance.now();
  try {
    const csv = Papa.unparse(this.currentData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${this.activeModel.name}_${timestamp}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`⚡ Export CSV — ${(performance.now() - start).toFixed(1)}ms — ${filename}`);
  } catch (error: any) {
    console.error('CSV export error:', error);
    await this.alert('Failed to export CSV: ' + error.message);
  }
}

export async function exportWorkflowJSON(this: ChumakApp) {
  if (!this.activeModel) {
    await this.alert('No workflow to export');
    return;
  }

  try {
    const source = this.sources.find((s) => s.id === this.activeModel.sourceId);
    const workflow = {
      version: '1.0',
      name: this.activeModel.name,
      exportedAt: new Date().toISOString(),
      source: {
        id: source?.id,
        name: source?.name,
        columns: source?.columns,
      },
      model: {
        id: this.activeModel.id,
        name: this.activeModel.name,
        steps: this.activeModel.steps,
      },
    };

    const json = JSON.stringify(workflow, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${this.activeModel.name}_workflow_${timestamp}.json`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('Exported workflow JSON:', filename);
  } catch (error: any) {
    console.error('Workflow export error:', error);
    await this.alert('Failed to export workflow: ' + error.message);
  }
}

export async function exportDataJSON(this: ChumakApp) {
  if (!this.currentData || this.currentData.length === 0) {
    await this.alert('No data to export');
    return;
  }

  const start = performance.now();
  try {
    const json = JSON.stringify(this.currentData, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${this.activeModel.name}_data_${timestamp}.json`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`⚡ Export JSON — ${(performance.now() - start).toFixed(1)}ms — ${filename}`);
  } catch (error: any) {
    console.error('JSON export error:', error);
    await this.alert('Failed to export JSON: ' + error.message);
  }
}

export async function copyCSVToClipboard(this: ChumakApp) {
  const pageData = this.getPaginatedData();
  if (!pageData || pageData.length === 0) {
    await this.alert('No data to copy on this page');
    return;
  }

  try {
    const csv = Papa.unparse(pageData);
    await navigator.clipboard.writeText(csv);
    await this.alert('Current page data copied to clipboard (CSV)!');
  } catch (error: any) {
    console.error('Copy to clipboard error:', error);
    await this.alert('Failed to copy to clipboard: ' + error.message);
  }
}

export async function copyJSONToClipboard(this: ChumakApp) {
  const pageData = this.getPaginatedData();
  if (!pageData || pageData.length === 0) {
    await this.alert('No data to copy on this page');
    return;
  }

  try {
    const json = JSON.stringify(pageData, null, 2);
    await navigator.clipboard.writeText(json);
    await this.alert('Current page data copied to clipboard (JSON)!');
  } catch (error: any) {
    console.error('Copy to clipboard error:', error);
    await this.alert('Failed to copy to clipboard: ' + error.message);
  }
}
