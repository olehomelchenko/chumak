import type { ChumakApp } from '../../chumak-app';
import { SchemaEngine } from '../../core/schema-engine';
import { autoSave, clearAllData as storageClearAllData } from '../../core/storage';

export function getTemplateConfigs(this: ChumakApp) {
  return [
    { id: 'join-modal-container', url: 'templates/join-modal.html' },
    { id: 'aggregate-modal-container', url: 'templates/aggregate-modal.html' },
    { id: 'import-csv-modal-container', url: 'templates/import-csv-modal.html' },
    { id: 'split-modal-container', url: 'templates/split-column-modal.html' },
    { id: 'unpivot-modal-container', url: 'templates/unpivot-modal.html' },
    { id: 'pivot-modal-container', url: 'templates/pivot-modal.html' },
    { id: 'replace-modal-container', url: 'templates/replace-modal.html' },
    // sort-modal is now rendered by Preact (see SortDialog.tsx)
    { id: 'slice-rows-modal-container', url: 'templates/slice-rows-modal.html' },
    // index-modal is now rendered by Preact (see IndexDialog.tsx)
    { id: 'derive-modal-container', url: 'templates/derive-modal.html' },
    { id: 'filter-modal-container', url: 'templates/filter-modal.html' },
    { id: 'regexp-match-modal-container', url: 'templates/regexp-match-modal.html' },
    { id: 'regexp-extract-modal-container', url: 'templates/regexp-extract-modal.html' },
    { id: 'date-modal-container', url: 'templates/date-modal.html' },
    { id: 'dedupe-modal-container', url: 'templates/dedupe-modal.html' },
    { id: 'column-editor-modal-container', url: 'templates/column-editor-modal.html' },
    { id: 'download-modal-container', url: 'templates/download-modal.html' },
    { id: 'import-url-modal-container', url: 'templates/import-url-modal.html' },
    { id: 'settings-modal-container', url: 'templates/settings-modal.html' },
  ];
}

export async function loadTemplates(this: ChumakApp) {
  const templates = (this as any).getTemplateConfigs();
  const baseUrl = (import.meta as any).env.BASE_URL || '/';

  for (const template of templates) {
    try {
      const url = `${baseUrl}${template.url}`;
      const response = await fetch(url);
      if (!response.ok) {
        console.error(
          `Failed to load template from ${url}: ${response.status} ${response.statusText}`
        );
        continue;
      }
      const html = await response.text();
      const container = document.getElementById(template.id);
      if (container) container.innerHTML = html;
    } catch (error) {
      console.error(`Error loading template ${template.url}:`, error);
    }
  }
}

export function switchToSource(this: ChumakApp, source: any) {
  this.activeSource = source;
  this.activeModel = null;
  this.currentData = source.data;
  this.columns = source.columns.map((c: any) => c.name);
  this.viewMode = 'dataset-info';
  this.activeStepIndex = null;
  this.viewingIntermediate = false;
  this.clearColumnSelection();
}

export function switchToModel(this: ChumakApp, model: any) {
  this.activeSource = null;
  this.activeModel = model;
  if (model.data && model.data.length > 0 && (!model.schema || model.schema.length === 0)) {
    model.schema = SchemaEngine.createInitialSchema(model.data);
  }
  this.currentData = model.data;
  this.viewMode = 'model';
  this.activeStepIndex = model.steps?.length > 0 ? model.steps.length - 1 : null;
  this.viewingIntermediate = false;
  this.clearColumnSelection();
  if (this.ribbonTab === 'data' || !this.ribbonTab) {
    this.ribbonTab = 'prepare';
  }
  if (this.currentData && this.currentData.length > 0) {
    this.columns = model.schema
      ? model.schema.map((c: any) => c.name)
      : Object.keys(this.currentData[0]);
  } else {
    this.columns = [];
  }
  this.updatePagination();
}

export async function createNewModel(this: ChumakApp, source: any) {
  const modelName = await this.prompt(
    'Enter name for new model:',
    `model_${this.models.filter((m) => m.sourceId === source.id).length + 1}`
  );
  if (!modelName || modelName.trim() === '') return;
  const existingModel = this.models.find(
    (m) => m.sourceId === source.id && m.name.toLowerCase() === modelName.trim().toLowerCase()
  );
  if (existingModel) {
    await this.alert(
      'A model with this name already exists for this source. Please choose a different name.'
    );
    return;
  }
  const newModel = {
    id: `mdl_${Date.now()}`,
    name: modelName.trim(),
    sourceId: source.id,
    steps: [] as any[],
    schema: JSON.parse(JSON.stringify(source.columns)),
    data: JSON.parse(JSON.stringify(source.data)),
  };
  const importStep = {
    import: {
      source: source.name,
      fileName: source.fileName,
      delimiter: source.delimiter,
      headerMode: source.headerMode,
    },
  } as any;
  if (source.customHeaders) importStep.import.customHeaders = source.customHeaders;
  newModel.steps.push(importStep);
  const typesStep = { types: {} as any };
  source.columns.forEach((col: any) => {
    typesStep.types[col.name] = col.type;
  });
  newModel.steps.push(typesStep);
  this.models.push(newModel);
  this.switchToModel(newModel);
  await autoSave(this.sources, this.models);
}

export async function createNewModelFromActive(this: ChumakApp) {
  if (!this.activeModel) {
    await this.alert('No active model selected');
    return;
  }
  const source = this.sources.find((s) => s.id === this.activeModel?.sourceId);
  if (!source) {
    await this.alert('Source not found for current model');
    return;
  }
  await this.createNewModel(source);
}

export async function copyCurrentModel(this: ChumakApp) {
  if (!this.activeModel) {
    await this.alert('No active model selected');
    return;
  }
  const newName = await this.prompt(
    'Enter name for copied model:',
    `${this.activeModel.name}_copy`
  );
  if (!newName || newName.trim() === '') return;
  const existingModel = this.models.find(
    (m) =>
      this.activeModel &&
      m.sourceId === this.activeModel.sourceId &&
      m.name.toLowerCase() === newName.trim().toLowerCase()
  );
  if (existingModel) {
    await this.alert(
      'A model with this name already exists for this source. Please choose a different name.'
    );
    return;
  }
  const copiedModel = {
    id: `mdl_${Date.now()}`,
    name: newName.trim(),
    sourceId: this.activeModel.sourceId,
    steps: JSON.parse(JSON.stringify(this.activeModel.steps)),
    schema: this.activeModel.schema ? JSON.parse(JSON.stringify(this.activeModel.schema)) : [],
    data: JSON.parse(JSON.stringify(this.activeModel.data)),
  };
  this.models.push(copiedModel);
  this.switchToModel(copiedModel);
  await autoSave(this.sources, this.models);
}

export async function renameCurrentModel(this: ChumakApp) {
  if (!this.activeModel) {
    await this.alert('No active model selected');
    return;
  }
  const newName = await this.prompt('Enter new name for model:', this.activeModel.name);
  if (!newName || newName.trim() === '') return;
  if (newName.trim() === this.activeModel.name) return;
  const existingModel = this.models.find(
    (m) =>
      m.sourceId === this.activeModel?.sourceId &&
      m.name.toLowerCase() === newName.trim().toLowerCase()
  );
  if (existingModel) {
    await this.alert(
      'A model with this name already exists for this source. Please choose a different name.'
    );
    return;
  }
  this.activeModel.name = newName.trim();
  await autoSave(this.sources, this.models);
}

export async function deleteCurrentModel(this: ChumakApp) {
  if (!this.activeModel) {
    await this.alert('No active model selected');
    return;
  }
  const sourceModels = this.models.filter((m) => m.sourceId === this.activeModel?.sourceId);
  if (sourceModels.length === 1) {
    await this.alert('Cannot delete the last model for this source.');
    return;
  }
  if (!(await this.confirm(`Delete model "${this.activeModel.name}"?\n\nThis cannot be undone.`)))
    return;
  const deletedModelId = this.activeModel.id;
  const sourceId = this.activeModel.sourceId;
  this.models = this.models.filter((m) => m.id !== deletedModelId);
  const remainingModels = this.models.filter((m) => m.sourceId === sourceId);
  if (remainingModels.length > 0) {
    this.switchToModel(remainingModels[0]);
  } else {
    this.activeModel = null;
    this.currentData = null;
    this.columns = [];
    this.viewMode = 'empty';
  }
  await autoSave(this.sources, this.models);
}

export async function renameSource(this: ChumakApp, source: any) {
  const newName = await this.prompt('Enter new name for source:', source.name);
  if (!newName || newName.trim() === '') return;
  if (newName.trim() === source.name) return;
  source.name = newName.trim();
  await autoSave(this.sources, this.models);
}

export async function deleteSource(this: ChumakApp, source: any) {
  const modelCount = this.models.filter((m) => m.sourceId === source.id).length;
  const message =
    modelCount > 0
      ? `Delete source "${source.name}" and its ${modelCount} model${modelCount > 1 ? 's' : ''}?\n\nThis cannot be undone.`
      : `Delete source "${source.name}"?\n\nThis cannot be undone.`;
  if (!(await this.confirm(message))) return;
  try {
    this.models = this.models.filter((m) => m.sourceId !== source.id);
    this.sources = this.sources.filter((s) => s.id !== source.id);
    if (
      this.activeSource?.id === source.id ||
      this.models.find((m) => m.id === this.activeModel?.id && m.sourceId === source.id)
    ) {
      this.activeSource = null;
      this.activeModel = null;
      this.currentData = null;
      this.columns = [];
      this.viewMode = 'empty';
    }
    await autoSave(this.sources, this.models);
  } catch (error: any) {
    console.error('Error deleting source:', error);
    await this.alert('Failed to delete source: ' + error.message);
  }
}

export async function clearAllData(this: ChumakApp) {
  if (!(await this.confirm('Clear all data from IndexedDB? This cannot be undone.'))) return;
  try {
    await storageClearAllData();
    this.sources = [];
    this.models = [];
    this.activeModel = null;
    this.currentData = null;
    this.columns = [];
    await this.alert('All data cleared successfully');
  } catch (error: any) {
    console.error('Error clearing data:', error);
    await this.alert('Failed to clear data: ' + error.message);
  }
}
