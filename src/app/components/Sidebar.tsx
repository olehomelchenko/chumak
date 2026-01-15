// Note: 'h' import not needed - Vite's JSX transform handles it
import { useComputed } from '@preact/signals';
import { useState } from 'preact/hooks';
import { AppStore } from '../stores/AppStore';
import { describeTransform } from '../../core/transforms';
import type { Source, Model } from '../types';
import styles from './Sidebar.module.css';

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
    <aside class={styles.leftPanel}>
      {/* Sources & Models */}
      <section class={styles.panelSection}>
        <h2 class={styles.header}>Sources & Models</h2>
        <div class={styles.importActions}>
          <button class={styles.importAction} onClick={onUploadClick} title="Upload CSV file">
            <span class="iconify" data-icon="carbon:upload"></span>
            <span>Upload</span>
          </button>
          <button
            class={styles.importAction}
            onClick={onPasteClick}
            title="Paste data from clipboard"
          >
            <span class="iconify" data-icon="carbon:paste"></span>
            <span>Paste</span>
          </button>
          <button class={styles.importAction} onClick={onUrlClick} title="Import from URL">
            <span class="iconify" data-icon="carbon:link"></span>
            <span>URL</span>
          </button>
        </div>
        <div class={styles.treeView}>
          {sources.value.map((source) => (
            <div key={source.id}>
              {/* Source */}
              <div
                class={`${styles.treeItem} ${styles.source} ${activeSource.value?.id === source.id ? styles.active : ''}`}
                onClick={() => onSwitchToSource(source)}
              >
                <span class={styles.icon}>📄</span>
                <span class={styles.name}>{source.name}</span>
              </div>

              {/* Models for this source */}
              {models.value
                .filter((m) => m.sourceId === source.id)
                .map((model) => (
                  <div
                    key={model.id}
                    class={`${styles.treeItem} ${styles.model} ${activeModel.value?.id === model.id ? styles.active : ''}`}
                    onClick={() => onSwitchToModel(model)}
                  >
                    <span class={styles.indent}></span>
                    <span class={styles.icon}>📊</span>
                    <span class={styles.name}>{model.name}</span>
                    <span class={styles.meta}>{getModelMeta(model)}</span>
                  </div>
                ))}
            </div>
          ))}

          {/* Show message when no sources */}
          {sources.value.length === 0 && (
            <div class={styles.empty}>
              No data sources imported yet. Click "Import CSV" to get started.
            </div>
          )}
        </div>
      </section>

      {/* Steps Panel */}
      <section class={`${styles.panelSection} ${styles.flex}`}>
        <div class={styles.tabs}>
          <button
            class={`${styles.tab} ${activeTab === 'steps' ? styles.active : ''}`}
            onClick={() => setActiveTab('steps')}
          >
            Steps
          </button>
          <button
            class={`${styles.tab} ${activeTab === 'json' ? styles.active : ''}`}
            onClick={() => setActiveTab('json')}
          >
            JSON
          </button>
        </div>

        {/* Steps List */}
        {activeTab === 'steps' && (
          <div class={styles.stepsList}>
            {!hasData.value && (
              <div class={styles.empty}>Import a CSV file to begin transforming data.</div>
            )}

            {/* Show steps if any exist */}
            {hasData.value && hasSteps.value && (
              <div>
                {(activeModel.value?.steps || []).map((step, index) => (
                  <div
                    key={index}
                    class={`${styles.stepItem} ${activeStepIndex.value === index ? styles.active : ''}`}
                    onClick={() => onViewStep(index)}
                  >
                    <span class={styles.number}>{`${index + 1}.`}</span>
                    <span class={styles.description}>{describeTransform(step)}</span>
                    {!step.import &&
                      !step.types &&
                      index === (activeModel.value?.steps?.length || 0) - 1 && (
                        <button
                          class={styles.edit}
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
                        class={styles.delete}
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
                  <div class={styles.viewingIntermediate}>
                    <span>{`Viewing step ${(activeStepIndex.value || 0) + 1} of ${activeModel.value?.steps?.length}`}</span>
                    <button onClick={onViewFinalResult} class={styles.return}>
                      View final result
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Show "no steps" message if data loaded but no steps */}
            {hasData.value && !hasSteps.value && (
              <div class={styles.empty}>
                No transformation steps yet. Use the toolbar above to transform your data.
              </div>
            )}
          </div>
        )}

        {/* JSON View */}
        {activeTab === 'json' && (
          <div class={styles.jsonView}>
            {!hasData.value && (
              <div class={styles.empty}>Import a CSV file to begin transforming data.</div>
            )}

            {/* Show "no steps" message */}
            {hasData.value && !hasSteps.value && (
              <div class={styles.empty}>No transformation steps yet.</div>
            )}

            {/* JSON View/Edit Area */}
            {hasData.value && hasSteps.value && (
              <div class={styles.jsonEditor}>
                {/* Read-only mode */}
                {!jsonEditMode.value && (
                  <div class={styles.jsonView}>
                    <button
                      class={styles.jsonEditToggle}
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
                    <pre class={styles.jsonContent}>{onGetStepsJson()}</pre>
                  </div>
                )}

                {/* Edit mode (danger zone) */}
                {jsonEditMode.value && (
                  <div class={styles.jsonEditDangerZone}>
                    {/* Warning banner */}
                    <div class={styles.jsonEditWarning}>
                      <span class={styles.jsonEditWarning__icon}>⚠️</span>
                      <div class={styles.jsonEditWarning__text}>
                        <strong>Danger Zone</strong> — Direct JSON editing bypasses validation.
                        Invalid changes may break your workflow.
                      </div>
                    </div>

                    {/* Textarea for editing */}
                    <textarea
                      class={`${styles.jsonEditTextarea} ${jsonEditError.value ? styles.error : ''}`}
                      value={jsonEditContent.value}
                      onInput={(e) => {
                        jsonEditContent.value = (e.target as HTMLTextAreaElement).value;
                        onValidateJsonEdit();
                      }}
                      spellcheck={false}
                    ></textarea>

                    {/* Error message */}
                    {jsonEditError.value && (
                      <div class={styles.jsonEditError}>{jsonEditError.value}</div>
                    )}

                    {/* Action buttons */}
                    <div class={styles.jsonEditActions}>
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
