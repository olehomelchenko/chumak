import { useState, useEffect } from 'preact/hooks';
import { AppStore } from '../stores/AppStore';
import { PersistenceService } from '../services/PersistenceService';
import styles from './DatasetInfoView.module.css';

export interface ModelInfoViewProps {
  onRenameModel: () => void;
  onDeleteModel: () => void;
}

export function ModelInfoView({ onRenameModel, onDeleteModel }: ModelInfoViewProps) {
  const activeModel = AppStore.activeModel;
  const sources = AppStore.sources;

  const model = activeModel.value;
  if (!model) return null;

  const source = sources.value.find((s) => s.id === model.sourceId);
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

  return (
    <div class={styles.datasetInfo}>
      <div class={styles.header}>
        <div>
          <h1 class={styles.title}>{model.name}</h1>
          <p class={styles.subtitle}>Model</p>
        </div>
        <div class={styles.actions}>
          <button class="button button--secondary" onClick={onRenameModel}>
            <span class="iconify" data-icon="carbon:edit" style={{ fontSize: '24px' }}></span>
            Rename
          </button>
          <button class="button button--danger" onClick={onDeleteModel}>
            <span class="iconify" data-icon="carbon:trash-can" style={{ fontSize: '24px' }}></span>
            Delete
          </button>
        </div>
      </div>

      <div class={styles.content}>
        {/* Metadata Card */}
        <div class={styles.infoCard}>
          <h3 class={styles.infoCard__title}>Model Information</h3>
          <dl class={styles.infoList}>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>Model Name</dt>
              <dd class={styles.infoList__value}>{model.name}</dd>
            </div>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>Source</dt>
              <dd class={styles.infoList__value}>{source?.name || 'Unknown'}</dd>
            </div>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>Rows</dt>
              <dd class={styles.infoList__value}>{model.data?.length?.toLocaleString() || 0}</dd>
            </div>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>Columns</dt>
              <dd class={styles.infoList__value}>{model.schema?.length || 0}</dd>
            </div>
            <div class={styles.infoList__item}>
              <dt class={styles.infoList__label}>Steps</dt>
              <dd class={styles.infoList__value}>
                {(model.steps?.length || 1) - 1} transformation step
                {(model.steps?.length || 1) - 1 !== 1 ? 's' : ''}
              </dd>
            </div>
            {model.isStale && (
              <div class={styles.infoList__item}>
                <dt class={styles.infoList__label}>Status</dt>
                <dd class={styles.infoList__value}>
                  <span class={styles.staleBadge} title="This model is outdated">
                    ⚠️ Stale
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Comment Card */}
        <div class={styles.infoCard}>
          <h3 class={styles.infoCard__title}>Comment</h3>
          {isEditingComment ? (
            <div>
              <textarea
                value={comment}
                onInput={(e) => setComment((e.target as HTMLTextAreaElement).value)}
                placeholder="Add a comment about this model..."
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
                  Save
                </button>
                <button class="button button--secondary" onClick={handleCommentCancel}>
                  Cancel
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
                  No comment added yet.
                </p>
              )}
              <button
                class="button button--secondary"
                onClick={() => setIsEditingComment(true)}
                style={{ marginTop: 'var(--space-sm)' }}
              >
                <span class="iconify" data-icon="carbon:edit" style={{ fontSize: '16px' }}></span>
                {comment ? 'Edit Comment' : 'Add Comment'}
              </button>
            </div>
          )}
        </div>

        {/* Column Schema Card */}
        <div class={`${styles.infoCard} ${styles.full}`}>
          <h3 class={styles.infoCard__title}>Column Schema</h3>
          <table class={styles.schemaTable}>
            <thead>
              <tr>
                <th class={styles.schemaTable__header}>Column Name</th>
                <th class={styles.schemaTable__header}>Type</th>
                <th class={styles.schemaTable__header}>Position</th>
              </tr>
            </thead>
            <tbody>
              {(model.schema || []).map((column: any, index: number) => (
                <tr key={column.name} class={styles.schemaTable__row}>
                  <td class={styles.schemaTable__cell}>{column.name}</td>
                  <td class={styles.schemaTable__cell}>
                    <span
                      class={`${styles.typeBadge} ${styles[`typeBadge--${column.type || column.inferredType}`]}`}
                    >
                      {column.type || column.inferredType}
                    </span>
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
