// Note: 'h' import not needed - Vite's JSX transform handles it
import { useComputed } from '@preact/signals';
import { useState } from 'preact/hooks';
import { AppStore } from '../stores/AppStore';
import { describeTransform } from '../../core/transforms';
import type { Source, Model } from '../types';

export interface SidebarProps {
  // Import actions
  onUploadClick: () => void;
  onPasteClick: () => void;
  onUrlClick: () => void;
  // Navigation
  onSwitchToSource: (source: Source) => void;
  onSwitchToModel: (model: Model) => void;
  // Steps
  onViewStep: (index: number) => void;
  onEditStep: (index: number) => void;
  onRemoveStep: (index: number) => void;
  onViewFinalResult: () => void;
  // JSON edit
  onGetStepsJson: () => string;
  onEnterJsonEditMode: () => void;
  onCancelJsonEdit: () => void;
  onApplyJsonEdit: () => void;
  onValidateJsonEdit: () => void;
  // Model meta helper
  getModelMeta: (model: Model) => string;
}

function getModelMeta(model: Model): string {
  if (!model) return '';
  const rowCount = model.data ? model.data.length : 0;
  const colCount = model.schema
    ? model.schema.length
    : model.data && model.data.length > 0
      ? Object.keys(model.data[0]).length
      : 0;
  const stepsCount = Math.max(0, (model.steps ? model.steps.length : 0) - 1);
  const stepsText = stepsCount === 1 ? '1 step' : `${stepsCount} steps`;
  return `${rowCount.toLocaleString()} x ${colCount} • ${stepsText}`;
}

export function Sidebar({
  onUploadClick,
  onPasteClick,
  onUrlClick,
  onSwitchToSource,
  onSwitchToModel,
  onViewStep,
  onEditStep,
  onRemoveStep,
  onViewFinalResult,
  onGetStepsJson,
  onEnterJsonEditMode,
  onCancelJsonEdit,
  onApplyJsonEdit,
  onValidateJsonEdit,
}: SidebarProps) {
  const sources = AppStore.sources;
  const models = AppStore.models;
  const activeSource = AppStore.activeSource;
  const activeModel = AppStore.activeModel;
  const currentData = AppStore.currentData;
  const activeStepIndex = AppStore.activeStepIndex;
  const viewingIntermediate = AppStore.viewingIntermediate;
  const jsonEditMode = AppStore.jsonEditMode;
  const jsonEditContent = AppStore.jsonEditContent;
  const jsonEditError = AppStore.jsonEditError;

  const [activeTab, setActiveTab] = useState<'steps' | 'json'>('steps');

  const hasData = useComputed(() => !!currentData.value);
  const hasSteps = useComputed(() => {
    const model = activeModel.value;
    return model?.steps && model.steps.length > 0;
  });

  return (
    <aside class="left-panel">
      {/* Sources & Models */}
      <section class="panel-section">
        <h2 class="panel-section__header">Sources & Models</h2>
        <div class="import-actions">
          <button class="import-action" onClick={onUploadClick} title="Upload CSV file">
            <span class="iconify" data-icon="carbon:upload"></span>
            <span>Upload</span>
          </button>
          <button class="import-action" onClick={onPasteClick} title="Paste data from clipboard">
            <span class="iconify" data-icon="carbon:paste"></span>
            <span>Paste</span>
          </button>
          <button class="import-action" onClick={onUrlClick} title="Import from URL">
            <span class="iconify" data-icon="carbon:link"></span>
            <span>URL</span>
          </button>
        </div>
        <div class="tree-view">
          {sources.value.map((source) => (
            <div key={source.id}>
              {/* Source */}
              <div
                class={`tree-item tree-item--source${activeSource.value?.id === source.id ? ' tree-item--active' : ''}`}
                onClick={() => onSwitchToSource(source)}
                style={{ cursor: 'pointer' }}
              >
                <span class="tree-item__icon">📄</span>
                <span class="tree-item__name">{source.name}</span>
              </div>

              {/* Models for this source */}
              {models.value
                .filter((m) => m.sourceId === source.id)
                .map((model) => (
                  <div
                    key={model.id}
                    class={`tree-item tree-item--model${activeModel.value?.id === model.id ? ' tree-item--active' : ''}`}
                    onClick={() => onSwitchToModel(model)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span class="tree-item__indent"></span>
                    <span class="tree-item__icon">📊</span>
                    <span class="tree-item__name">{model.name}</span>
                    <span class="tree-item__meta">{getModelMeta(model)}</span>
                  </div>
                ))}
            </div>
          ))}

          {/* Show message when no sources */}
          {sources.value.length === 0 && (
            <div style={{ padding: '1rem', color: '#888', fontSize: '0.875rem' }}>
              No data sources imported yet. Click "Import CSV" to get started.
            </div>
          )}
        </div>
      </section>

      {/* Steps Panel */}
      <section class="panel-section panel-section--flex">
        <div class="tabs">
          <button
            class={`tab${activeTab === 'steps' ? ' tab--active' : ''}`}
            onClick={() => setActiveTab('steps')}
          >
            Steps
          </button>
          <button
            class={`tab${activeTab === 'json' ? ' tab--active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            JSON
          </button>
        </div>

        {/* Steps List */}
        {activeTab === 'steps' && (
          <div class="steps-list">
            {!hasData.value && (
              <div style={{ padding: '1rem', color: '#888', fontSize: '0.875rem' }}>
                Import a CSV file to begin transforming data.
              </div>
            )}

            {/* Show steps if any exist */}
            {hasData.value && hasSteps.value && (
              <div>
                {(activeModel.value?.steps || []).map((step, index) => (
                  <div
                    key={index}
                    class={`step-item${activeStepIndex.value === index ? ' step-item--active' : ''}`}
                    onClick={() => onViewStep(index)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span class="step-item__number">{`${index + 1}.`}</span>
                    <span class="step-item__description">{describeTransform(step)}</span>
                    {!step.import &&
                      !step.types &&
                      index === (activeModel.value?.steps?.length || 0) - 1 && (
                        <button
                          class="step-item__edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditStep(index);
                          }}
                          title="Edit this step"
                        >
                          ✎
                        </button>
                      )}
                    {!step.import && (
                      <button
                        class="step-item__delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveStep(index);
                        }}
                        title="Remove this step"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                {/* Info text when viewing intermediate step */}
                {viewingIntermediate.value && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(0, 187, 206, 0.05)',
                      borderTop: '1px solid var(--color-cyan)',
                      marginTop: '0.5rem',
                      fontSize: '0.875rem',
                      color: 'var(--color-dark-gray)',
                    }}
                  >
                    <span>{`Viewing step ${(activeStepIndex.value || 0) + 1} of ${activeModel.value?.steps?.length}`}</span>
                    <button
                      onClick={onViewFinalResult}
                      style={{
                        marginLeft: '1rem',
                        color: 'var(--color-cyan)',
                        textDecoration: 'underline',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      View final result
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Show "no steps" message if data loaded but no steps */}
            {hasData.value && !hasSteps.value && (
              <div style={{ padding: '1rem', color: '#888', fontSize: '0.875rem' }}>
                No transformation steps yet. Use the toolbar above to transform your data.
              </div>
            )}
          </div>
        )}

        {/* JSON View */}
        {activeTab === 'json' && (
          <div class="json-view">
            {!hasData.value && (
              <div style={{ padding: '1rem', color: '#888', fontSize: '0.875rem' }}>
                Import a CSV file to begin transforming data.
              </div>
            )}

            {/* Show "no steps" message */}
            {hasData.value && !hasSteps.value && (
              <div style={{ padding: '1rem', color: '#888', fontSize: '0.875rem' }}>
                No transformation steps yet.
              </div>
            )}

            {/* JSON View/Edit Area */}
            {hasData.value && hasSteps.value && (
              <div class="json-editor">
                {/* Read-only mode */}
                {!jsonEditMode.value && (
                  <div class="json-view">
                    <button
                      class="json-edit-toggle"
                      onClick={onEnterJsonEditMode}
                      title="Edit raw JSON (advanced - use with caution)"
                    >
                      <span
                        class="iconify"
                        data-icon="carbon:edit"
                        style={{ width: '14px', height: '14px' }}
                      ></span>
                      Edit JSON
                    </button>
                    <pre class="json-view__content">{onGetStepsJson()}</pre>
                  </div>
                )}

                {/* Edit mode (danger zone) */}
                {jsonEditMode.value && (
                  <div class="json-edit-danger-zone">
                    {/* Warning banner */}
                    <div class="json-edit-warning">
                      <span class="json-edit-warning__icon">⚠️</span>
                      <div class="json-edit-warning__text">
                        <strong>Danger Zone</strong> — Direct JSON editing bypasses validation.
                        Invalid changes may break your workflow.
                      </div>
                    </div>

                    {/* Textarea for editing */}
                    <textarea
                      class={`json-edit-textarea${jsonEditError.value ? ' json-edit-textarea--error' : ''}`}
                      value={jsonEditContent.value}
                      onInput={(e) => {
                        jsonEditContent.value = (e.target as HTMLTextAreaElement).value;
                        onValidateJsonEdit();
                      }}
                      spellcheck={false}
                    ></textarea>

                    {/* Error message */}
                    {jsonEditError.value && (
                      <div class="json-edit-error">{jsonEditError.value}</div>
                    )}

                    {/* Action buttons */}
                    <div class="json-edit-actions">
                      <button
                        class="button button--secondary button--small"
                        onClick={onCancelJsonEdit}
                      >
                        Cancel
                      </button>
                      <button
                        class="button button--danger button--small"
                        onClick={onApplyJsonEdit}
                        disabled={!!jsonEditError.value}
                      >
                        Apply Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </aside>
  );
}
