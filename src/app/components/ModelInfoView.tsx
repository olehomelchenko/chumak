import { useState, useEffect } from 'preact/hooks';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { PersistenceService } from '../services/PersistenceService';
import { TypeIndicator } from './TypeIndicator';
import styles from './DatasetInfoView.module.css';

export interface ModelInfoViewProps {
  onRenameModel: () => void;
  onDeleteModel: () => void;
}

export function ModelInfoView({ onRenameModel, onDeleteModel }: ModelInfoViewProps) {
  const { t } = useTranslation('ui');
  const activeModel = AppStore.activeModel;
  const sources = AppStore.sources;
  const models = AppStore.models;

  const model = activeModel.value;
  if (!model) return null;

  const source = sources.value.find((s) => s.id === model.sourceId);
  const parentModel = source ? null : models.value.find((m) => m.id === model.sourceId);
  const [comment, setComment] = useState(model.comment || '');
  const [isEditingComment, setIsEditingComment] = useState(false);

  // Sync comment when model changes
  useEffect(() => {
    if (model) {
      setComment(model.comment || '');
      setIsEditingComment(false);
    }
  }, [model.id]);

  const handleCommentSave = () => {
    if (model) {
      model.comment = comment;
      AppStore.models.value = [...AppStore.models.value];
      PersistenceService.autoSave();
      setIsEditingComment(false);
    }
  };

  const handleCommentCancel = () => {
    setComment(model.comment || '');
    setIsEditingComment(false);
  };

  const stepCount = (model.steps?.length || 1) - 1;

  return (
    <div class={styles.datasetInfo}>
      <div class={styles.header}>
        <div>
          <h1 class={styles.title}>{model.name}</h1>
          <p class={styles.subtitle}>{t('modelInfo.subtitle')}</p>
        </div>
        <div class={styles.actions}>
          <button class="button button--ghost" onClick={onRenameModel}>
            <span class="iconify" aria-hidden="true" data-icon="carbon:edit"></span>
            {t('modelInfo.rename')}
          </button>
          <button class="button button--ghost button--danger-text" onClick={onDeleteModel}>
            <span class="iconify" aria-hidden="true" data-icon="carbon:trash-can"></span>
            {t('modelInfo.delete')}
          </button>
        </div>
      </div>

      <div class={styles.content}>
        {/* Metadata Card */}
        <div class={styles.infoCard}>
          <h3 class={styles.infoCard__title}>{t('modelInfo.heading')}</h3>
          <dl class={styles.infoList}>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>{t('modelInfo.labels.modelName')}</dt>
              <dd class={styles.infoList__value}>{model.name}</dd>
            </div>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>{t('modelInfo.labels.source')}</dt>
              <dd class={styles.infoList__value}>
                {source?.name || parentModel?.name || t('modelInfo.unknown')}
              </dd>
            </div>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>{t('modelInfo.labels.rows')}</dt>
              <dd class={styles.infoList__value}>{model.data?.length?.toLocaleString() || 0}</dd>
            </div>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>{t('modelInfo.labels.columns')}</dt>
              <dd class={styles.infoList__value}>{model.schema?.length || 0}</dd>
            </div>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>{t('modelInfo.labels.steps')}</dt>
              <dd class={styles.infoList__value}>
                {t('modelInfo.transformationSteps', { count: stepCount })}
              </dd>
            </div>
            {model.isStale && (
              <div class={styles.infoList__item}>
                <dt class={styles.infoList__label}>Status</dt>
                <dd class={styles.infoList__value}>
                  <span class={styles.staleBadge} title={t('modelInfo.staleTitle')}>
                    {t('modelInfo.staleStatus')}
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Comment Card */}
        <div class={styles.infoCard}>
          <h3 class={styles.infoCard__title}>{t('modelInfo.commentHeading')}</h3>
          {isEditingComment ? (
            <div>
              <textarea
                value={comment}
                onInput={(e) => setComment((e.target as HTMLTextAreaElement).value)}
                placeholder={t('modelInfo.commentPlaceholder')}
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
                  {t('modelInfo.save')}
                </button>
                <button class="button button--secondary" onClick={handleCommentCancel}>
                  {t('modelInfo.cancel')}
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
                  {t('modelInfo.noComment')}
                </p>
              )}
              <button
                class="button button--ghost"
                onClick={() => setIsEditingComment(true)}
                style={{ marginTop: 'var(--space-sm)' }}
              >
                <span class="iconify" aria-hidden="true" data-icon="carbon:edit"></span>
                {comment ? t('modelInfo.editComment') : t('modelInfo.addComment')}
              </button>
            </div>
          )}
        </div>

        {/* Column Schema Card */}
        <div class={`${styles.infoCard} ${styles.full}`}>
          <h3 class={styles.infoCard__title}>
            {t('modelInfo.schemaHeading')}
            <span class={styles.infoCard__subtitle} title={t('modelInfo.schemaTitle')}>
              {t('modelInfo.schemaSubtitle')}
            </span>
          </h3>
          <table class={styles.schemaTable}>
            <thead>
              <tr>
                <th class={styles.schemaTable__header}>{t('modelInfo.tableHeaders.column')}</th>
                <th class={styles.schemaTable__header}>{t('modelInfo.tableHeaders.position')}</th>
              </tr>
            </thead>
            <tbody>
              {(model.schema || []).map((column: any, index: number) => (
                <tr key={column.name} class={styles.schemaTable__row}>
                  <td class={styles.schemaTable__cell}>
                    <TypeIndicator type={column.type || column.inferredType} size="small" />
                    <span class={styles.columnName}>{column.name}</span>
                  </td>
                  <td class={styles.schemaTable__cell}>{index + 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
