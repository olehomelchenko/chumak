import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { DependencyService } from '../services/DependencyService';
import type { Source, Model } from '../types';
import styles from './JoinTreeSelector.module.css';

export interface JoinTreeSelectorProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  excludeId?: string | null; // ID to exclude from selection (e.g., current active model)
  onPreview?: (id: string) => void; // Callback for preview button
}

export function JoinTreeSelector({
  selectedId,
  onSelect,
  excludeId,
  onPreview,
}: JoinTreeSelectorProps) {
  const { t } = useTranslation('dialogs');
  const sources = AppStore.sources.value;
  const models = AppStore.models.value;

  const handleSourceClick = (source: Source) => {
    if (source.id !== excludeId) {
      onSelect(source.id);
    }
  };

  const handleModelClick = (model: Model) => {
    if (model.id !== excludeId) {
      onSelect(model.id);
    }
  };

  const handlePreviewClick = (e: Event, id: string) => {
    e.stopPropagation();
    if (onPreview) {
      onPreview(id);
    }
  };

  return (
    <div class={styles.treeView}>
      {sources.map((source) => (
        <div key={source.id}>
          {/* Source */}
          <div
            class={`${styles.treeItem} ${styles.source} ${selectedId === source.id ? styles.active : ''} ${source.id === excludeId ? styles.disabled : ''}`}
            onClick={() => handleSourceClick(source)}
          >
            <span class={styles.icon}>📄</span>
            <span class={styles.name}>{source.name}</span>
            {onPreview && (
              <button
                class={styles.previewButton}
                onClick={(e) => handlePreviewClick(e, source.id)}
                title={t('joinTreeSelector.previewTable')}
              >
                <span
                  class="iconify"
                  aria-hidden="true"
                  data-icon="carbon:view"
                  style={{ fontSize: '14px' }}
                ></span>
              </button>
            )}
          </div>

          {/* Models for this source (including chained models) */}
          {models
            .filter((m) => {
              if (m.sourceId === source.id) return true;
              const rootSourceId = DependencyService.getRootSourceId(models, sources, m.id);
              return rootSourceId === source.id;
            })
            .map((model) => (
              <div
                key={model.id}
                class={`${styles.treeItem} ${styles.model} ${selectedId === model.id ? styles.active : ''} ${model.id === excludeId ? styles.disabled : ''}`}
                onClick={() => handleModelClick(model)}
              >
                <span class={styles.indent}></span>
                <span class={styles.icon}>📊</span>
                <span class={styles.name}>{model.name}</span>
                {onPreview && (
                  <button
                    class={styles.previewButton}
                    onClick={(e) => handlePreviewClick(e, model.id)}
                    title={t('joinTreeSelector.previewTable')}
                  >
                    <span
                      class="iconify"
                      aria-hidden="true"
                      data-icon="carbon:view"
                      style={{ fontSize: '14px' }}
                    ></span>
                  </button>
                )}
              </div>
            ))}
        </div>
      ))}

      {/* Show message when no sources */}
      {sources.length === 0 && <div class={styles.empty}>{t('joinTreeSelector.noSources')}</div>}
    </div>
  );
}
