// Note: 'h' import not needed - Vite's JSX transform handles it
import { useComputed } from '@preact/signals';
import { useState } from 'preact/hooks';
import { AppStore } from '../stores/AppStore';
import { describeTransform } from '../../core/transforms';
import { getDependencyTooltip } from '../handlers/core/helper-handlers';
import { DependencyService } from '../services/DependencyService';
import type { Source, Model } from '../types';
import styles from './Sidebar.module.css';
import { useTranslation } from 'preact-i18next';
import i18n from '../../i18n';

export interface SidebarProps {
  // Import actions
  onUploadClick: () => void;
  onUrlClick: () => void;
  onEnterDataClick: () => void;
  onGenerateClick: () => void;
  // Navigation
  onSwitchToSource: (source: Source) => void;
  onSwitchToModel: (model: Model) => void;
  // Steps
  onViewStep: (index: number) => void;
  onEditStep: (index: number) => void;
  onRemoveStep: (index: number) => void;
  onViewFinalResult: () => void;
  onForkAtStep: () => void;
  onUndo: () => void;
  onRedo: () => void;
  // JSON edit
  onGetStepsJson: () => string;
  onEnterJsonEditMode: () => void;
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
  const stepsText =
    stepsCount === 1
      ? i18n.t('common:sidebar.steps.step_one')
      : i18n.t('common:sidebar.steps.step_other', { count: stepsCount });
  return `${rowCount.toLocaleString()} x ${colCount} • ${stepsText}`;
}

export function Sidebar({
  onUploadClick,
  onUrlClick,
  onEnterDataClick,
  onGenerateClick,
  onSwitchToSource,
  onSwitchToModel,
  onViewStep,
  onEditStep,
  onRemoveStep,
  onViewFinalResult,
  onForkAtStep,
  onUndo,
  onRedo,
  onGetStepsJson,
  onEnterJsonEditMode,
}: SidebarProps) {
  const { t } = useTranslation('common');
  const sources = AppStore.sources;
  const models = AppStore.models;
  const activeSource = AppStore.activeSource;
  const activeModel = AppStore.activeModel;
  const currentData = AppStore.currentData;
  const activeStepIndex = AppStore.activeStepIndex;
  const viewingIntermediate = AppStore.viewingIntermediate;

  const [activeTab, setActiveTab] = useState<'steps' | 'json'>('steps');
  const mod = /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘' : 'Ctrl';

  const hasData = useComputed(() => !!currentData.value);
  const hasSteps = useComputed(() => {
    const model = activeModel.value;
    return model?.steps && model.steps.length > 0;
  });

  const canUndo = useComputed(() => {
    const id = activeModel.value?.id;
    const history = AppStore.history.value;
    if (!id) return false;
    const stack = history.get(id);
    return !!stack && stack.undo.length > 0;
  });
  const canRedo = useComputed(() => {
    const id = activeModel.value?.id;
    const history = AppStore.history.value;
    if (!id) return false;
    const stack = history.get(id);
    return !!stack && stack.redo.length > 0;
  });

  return (
    <aside class={styles.leftPanel}>
      {/* Sources & Models */}
      <section class={styles.panelSection}>
        <h2 class={styles.header}>{t('sidebar.title')}</h2>
        <div class={styles.importActions}>
          <button class={styles.importAction} onClick={onUploadClick} title={t('tooltips.upload')}>
            <span class="iconify" aria-hidden="true" data-icon="carbon:upload"></span>
            <span>{t('sidebar.actions.upload')}</span>
          </button>
          <button class={styles.importAction} onClick={onUrlClick} title={t('tooltips.url')}>
            <span class="iconify" aria-hidden="true" data-icon="carbon:link"></span>
            <span>{t('sidebar.actions.url')}</span>
          </button>
          <button
            class={styles.importAction}
            onClick={onEnterDataClick}
            title={t('tooltips.enter')}
          >
            <span class="iconify" aria-hidden="true" data-icon="carbon:text-long-paragraph"></span>
            <span>{t('sidebar.actions.enter')}</span>
          </button>
          <button
            class={styles.importAction}
            onClick={onGenerateClick}
            title={t('tooltips.generate')}
          >
            <span class="iconify" aria-hidden="true" data-icon="carbon:data-2"></span>
            <span>{t('sidebar.actions.generate')}</span>
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

              {/* Models for this source (including chained models whose root source is this one) */}
              {models.value
                .filter((m) => {
                  if (m.sourceId === source.id) return true;
                  // Chained model: resolve root source
                  const rootSourceId = DependencyService.getRootSourceId(
                    models.value,
                    sources.value,
                    m.id
                  );
                  return rootSourceId === source.id;
                })
                .map((model) => (
                  <div
                    key={model.id}
                    class={`${styles.treeItem} ${styles.model} ${activeModel.value?.id === model.id ? styles.active : ''} ${model.isStale ? styles.stale : ''}`}
                    onClick={() => onSwitchToModel(model)}
                  >
                    <span class={styles.indent}></span>
                    <span class={styles.icon}>📊</span>
                    <span class={styles.name} title={getDependencyTooltip(model)}>
                      {model.name}
                    </span>
                    {model.isStale && (
                      <span class={styles.staleBadge} title={t('tooltips.staleModel')}>
                        ⚠️
                      </span>
                    )}
                    <span class={styles.meta}>{getModelMeta(model)}</span>
                  </div>
                ))}
            </div>
          ))}

          {/* Show message when no sources */}
          {sources.value.length === 0 && <div class={styles.empty}>{t('sidebar.empty')}</div>}
        </div>
      </section>

      {/* Steps Panel */}
      <section class={`${styles.panelSection} ${styles.flex}`}>
        <div class={styles.tabs}>
          <button
            class={`${styles.tab} ${activeTab === 'steps' ? styles.active : ''}`}
            onClick={() => setActiveTab('steps')}
          >
            {t('labels.steps')}
          </button>
          <button
            class={`${styles.tab} ${activeTab === 'json' ? styles.active : ''}`}
            onClick={() => setActiveTab('json')}
          >
            {t('labels.json')}
          </button>
          <div class={styles.undoRedo}>
            <button
              class={styles.undoRedoButton}
              onClick={onUndo}
              disabled={!canUndo.value}
              title={`${t('buttons.undo')} (${mod}+Z)`}
            >
              <span
                class="iconify"
                aria-hidden="true"
                data-icon="carbon:undo"
                style={{ width: '16px', height: '16px' }}
              ></span>
            </button>
            <button
              class={styles.undoRedoButton}
              onClick={onRedo}
              disabled={!canRedo.value}
              title={`${t('buttons.redo')} (${mod}+Shift+Z)`}
            >
              <span
                class="iconify"
                aria-hidden="true"
                data-icon="carbon:redo"
                style={{ width: '16px', height: '16px' }}
              ></span>
            </button>
          </div>
        </div>

        {/* Steps List */}
        {activeTab === 'steps' && (
          <div class={styles.stepsList}>
            {!hasData.value && <div class={styles.empty}>{t('sidebar.emptyData')}</div>}

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
                    {!step.import && !step.types && (
                      <button
                        class={styles.edit}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditStep(index);
                        }}
                        title={t('tooltips.editStep')}
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
                        title={t('tooltips.removeStep')}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                {/* Info text when viewing intermediate step */}
                {viewingIntermediate.value && (
                  <div class={styles.viewingIntermediate}>
                    <span>
                      {t('sidebar.steps.viewingStep', {
                        current: (activeStepIndex.value || 0) + 1,
                        total: activeModel.value?.steps?.length,
                      })}
                    </span>
                    <div class={styles.viewingActions}>
                      <button
                        onClick={onForkAtStep}
                        class={styles.fork}
                        title={t('tooltips.forkStep')}
                      >
                        {t('sidebar.steps.forkFromHere')}
                      </button>
                      <button onClick={onViewFinalResult} class={styles.return}>
                        {t('sidebar.steps.viewFinalResult')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Show "no steps" message if data loaded but no steps */}
            {hasData.value && !hasSteps.value && (
              <div class={styles.empty}>{t('sidebar.steps.noStepsHelp')}</div>
            )}
          </div>
        )}

        {/* JSON View */}
        {activeTab === 'json' && (
          <div class={styles.jsonView}>
            {!hasData.value && <div class={styles.empty}>{t('sidebar.emptyData')}</div>}

            {/* Show "no steps" message */}
            {hasData.value && !hasSteps.value && (
              <div class={styles.empty}>{t('sidebar.steps.noStepsYet')}</div>
            )}

            {/* JSON View */}
            {hasData.value && hasSteps.value && (
              <div class={styles.jsonEditor}>
                <button
                  class={styles.jsonEditToggle}
                  onClick={onEnterJsonEditMode}
                  title={t('tooltips.editJson')}
                >
                  <span
                    class="iconify"
                    aria-hidden="true"
                    data-icon="carbon:edit"
                    style={{ width: '14px', height: '14px' }}
                  ></span>
                  {t('sidebar.steps.editJson')}
                </button>
                <pre class={styles.jsonContent}>{onGetStepsJson()}</pre>
              </div>
            )}
          </div>
        )}
      </section>
    </aside>
  );
}
