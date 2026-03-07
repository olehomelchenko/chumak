import { useState, useEffect } from 'preact/hooks';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { getDependencyTooltip } from '../handlers/core/helper-handlers';
import type { Source, Model } from '../types';
import { PersistenceService } from '../services/PersistenceService';
import { TypeIndicator } from './TypeIndicator';
import styles from './DatasetInfoView.module.css';

export interface DatasetInfoViewProps {
  onRenameSource: (source: Source) => void;
  onDeleteSource: (source: Source) => void;
  onSwitchToModel: (model: Model) => void;
  onCreateNewModel: (source: Source) => void;
  onReplaceSource: (source: Source) => void;
  onRestoreBackup: (source: Source) => void;
  onEditData: (source: Source) => void;
}

export function DatasetInfoView({
  onRenameSource,
  onDeleteSource,
  onSwitchToModel,
  onCreateNewModel,
  onReplaceSource,
  onRestoreBackup,
  onEditData,
}: DatasetInfoViewProps) {
  const { t } = useTranslation('ui');
  const activeSource = AppStore.activeSource;
  const models = AppStore.models;

  const source = activeSource.value;
  if (!source) return null;

  const sourceModels = models.value.filter((m) => m.sourceId === source.id);
  const [comment, setComment] = useState(source.comment || '');
  const [isEditingComment, setIsEditingComment] = useState(false);

  // Sync comment when source changes
  useEffect(() => {
    if (source) {
      setComment(source.comment || '');
      setIsEditingComment(false);
    }
  }, [source.id]);

  const handleCommentSave = () => {
    if (source) {
      source.comment = comment;
      AppStore.sources.value = [...AppStore.sources.value];
      PersistenceService.autoSave();
      setIsEditingComment(false);
    }
  };

  const handleCommentCancel = () => {
    setComment(source.comment || '');
    setIsEditingComment(false);
  };

  return (
    <div class={styles.datasetInfo}>
      <div class={styles.header}>
        <div>
          <h1 class={styles.title}>{source.name}</h1>
          <p class={styles.subtitle}>{t('datasetInfo.subtitle')}</p>
        </div>
        <div class={styles.actions}>
          {source.rawText && (
            <button class="button button--secondary" onClick={() => onEditData(source)}>
              <span
                class="iconify"
                data-icon="carbon:text-long-paragraph"
                style={{ fontSize: '24px' }}
              ></span>
              {t('datasetInfo.actions.editData')}
            </button>
          )}
          <button class="button button--secondary" onClick={() => onReplaceSource(source)}>
            <span class="iconify" data-icon="carbon:cyclostat" style={{ fontSize: '24px' }}></span>
            {t('datasetInfo.actions.replace')}
          </button>
          {source.backup && (
            <button class="button button--secondary" onClick={() => onRestoreBackup(source)}>
              <span class="iconify" data-icon="carbon:undo" style={{ fontSize: '24px' }}></span>
              {t('datasetInfo.actions.restore')}
            </button>
          )}
          <button class="button button--secondary" onClick={() => onRenameSource(source)}>
            <span class="iconify" data-icon="carbon:edit" style={{ fontSize: '24px' }}></span>
            {t('datasetInfo.actions.rename')}
          </button>
          <button class="button button--danger" onClick={() => onDeleteSource(source)}>
            <span class="iconify" data-icon="carbon:trash-can" style={{ fontSize: '24px' }}></span>
            {t('datasetInfo.actions.delete')}
          </button>
        </div>
      </div>

      <div class={styles.content}>
        {/* Metadata Card */}
        <div class={styles.infoCard}>
          <h3 class={styles.infoCard__title}>{t('datasetInfo.title')}</h3>
          <dl class={styles.infoList}>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>{t('datasetInfo.labels.sourceName')}</dt>
              <dd class={styles.infoList__value}>{source.name}</dd>
            </div>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>{t('datasetInfo.labels.originalFile')}</dt>
              <dd class={styles.infoList__value}>{source.fileName}</dd>
            </div>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>{t('datasetInfo.labels.rows')}</dt>
              <dd class={styles.infoList__value}>{source.rowCount?.toLocaleString()}</dd>
            </div>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>{t('datasetInfo.labels.columns')}</dt>
              <dd class={styles.infoList__value}>{source.columns?.length}</dd>
            </div>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>{t('datasetInfo.labels.fileSize')}</dt>
              <dd
                class={styles.infoList__value}
              >{`${((source.rawSize || 0) / 1024).toFixed(1)} KB`}</dd>
            </div>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>{t('datasetInfo.labels.imported')}</dt>
              <dd class={styles.infoList__value}>
                {source.createdAt
                  ? new Date(source.createdAt).toLocaleString()
                  : t('modelInfo.unknown')}
              </dd>
            </div>
          </dl>
        </div>

        {/* Comment Card */}
        <div class={styles.infoCard}>
          <h3 class={styles.infoCard__title}>{t('datasetInfo.labels.comment')}</h3>
          {isEditingComment ? (
            <div>
              <textarea
                value={comment}
                onInput={(e) => setComment((e.target as HTMLTextAreaElement).value)}
                placeholder={t('datasetInfo.commentPlaceholder')}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: 'var(--space-sm)',
                  border: '1px solid var(--color-medium-gray)',
                  borderRadius: 'var(--border-radius)',
                  fontFamily: 'var(--font-family-base)',
                  fontSize: 'var(--font-size-base)',
                  resize: 'vertical',
                }}
              />
              <div
                style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}
              >
                <button class="button button--primary" onClick={handleCommentSave}>
                  {t('datasetInfo.commentSave')}
                </button>
                <button class="button button--secondary" onClick={handleCommentCancel}>
                  {t('datasetInfo.commentCancel')}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {comment ? (
                <p
                  style={{ whiteSpace: 'pre-wrap', color: 'var(--color-midnight-blue)', margin: 0 }}
                >
                  {comment}
                </p>
              ) : (
                <p style={{ color: 'var(--color-dark-gray)', fontStyle: 'italic', margin: 0 }}>
                  {t('datasetInfo.noComment')}
                </p>
              )}
              <button
                class="button button--secondary"
                onClick={() => setIsEditingComment(true)}
                style={{ marginTop: 'var(--space-sm)' }}
              >
                <span class="iconify" data-icon="carbon:edit" style={{ fontSize: '16px' }}></span>
                {comment ? t('datasetInfo.commentEditButton') : t('datasetInfo.commentAdd')}
              </button>
            </div>
          )}
        </div>

        {/* Models List Card */}
        <div class={styles.infoCard}>
          <h3 class={styles.infoCard__title}>
            {t('datasetInfo.models.title')}
            <span class={styles.badge}>{sourceModels.length}</span>
          </h3>
          <div class={styles.modelsList}>
            {sourceModels.map((model) => {
              const stepCount = (model.steps?.length || 1) - 1;
              const rowCount = model.data?.length || 0;
              return (
                <div key={model.id} class={styles.modelCard} onClick={() => onSwitchToModel(model)}>
                  <div class={styles.modelCard__icon}>📊</div>
                  <div class={styles.modelCard__content}>
                    <div class={styles.modelCard__name} title={getDependencyTooltip(model)}>
                      {model.name}
                      {model.isStale && (
                        <span
                          class={styles.staleBadge}
                          title={t('datasetInfo.models.staleTooltip')}
                        >
                          ⚠️
                        </span>
                      )}
                    </div>
                    <div class={styles.modelCard__meta}>
                      <span>{t('datasetInfo.models.viewSteps', { count: stepCount })}</span>
                      <span>•</span>
                      <span>{t('datasetInfo.models.rows', { count: rowCount })}</span>
                    </div>
                  </div>
                  <div class={styles.modelCardArrow}>→</div>
                </div>
              );
            })}

            {/* New Model button */}
            <button
              class="button button--secondary"
              onClick={() => onCreateNewModel(source)}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              ➕ {t('datasetInfo.models.create')}
            </button>
          </div>
        </div>

        {/* Column Schema Card */}
        <div class={`${styles.infoCard} ${styles.full}`}>
          <h3 class={styles.infoCard__title}>
            {t('datasetInfo.schema.title')}
            <span class={styles.infoCard__subtitle} title={t('datasetInfo.schema.subtitleTooltip')}>
              {t('datasetInfo.schema.subtitle')}
            </span>
          </h3>
          <table class={styles.schemaTable}>
            <thead>
              <tr>
                <th class={styles.schemaTable__header}>{t('datasetInfo.schema.column')}</th>
                <th class={styles.schemaTable__header}>{t('datasetInfo.schema.position')}</th>
              </tr>
            </thead>
            <tbody>
              {(source.columns || []).map((column: any) => (
                <tr key={column.name} class={styles.schemaTable__row}>
                  <td class={styles.schemaTable__cell}>
                    <TypeIndicator type={column.type || column.inferredType} size="small" />
                    <span class={styles.columnName}>{column.name}</span>
                  </td>
                  <td class={styles.schemaTable__cell}>{column.originalPosition + 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
