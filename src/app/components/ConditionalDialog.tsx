// Dynamic expression docs intentionally skipped here due to multi-field layout complexity
// (multiple when/then/else editors). Can be added later by aggregating tokens across all fields.
import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ExpressionEditor } from './ExpressionEditor';
import styles from './form-controls.module.css';

export function ConditionalDialog() {
  const { t } = useTranslation('dialogs');
  const { column, conditions, else: elseValue, error } = DialogStore.conditionalState;

  const addCondition = () => {
    conditions.value = [...conditions.value, { when: '', then: '' }];
  };

  const removeCondition = (index: number) => {
    conditions.value = conditions.value.filter((_, i) => i !== index);
  };

  const updateCondition = (index: number, field: 'when' | 'then', value: string) => {
    const updated = [...conditions.value];
    updated[index] = { ...updated[index], [field]: value };
    conditions.value = updated;
  };

  return (
    <div>
      <p class={styles.helpText} style={{ marginBottom: '1rem' }}>
        {t('conditional.description')}
      </p>

      <div class={styles.group}>
        <label class={styles.label}>{t('conditional.outputNameLabel')}</label>
        <input
          type="text"
          class={styles.input}
          value={column.value}
          onInput={(e) => (column.value = (e.target as HTMLInputElement).value)}
          placeholder={t('conditional.outputNamePlaceholder')}
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>{t('conditional.conditionsLabel')}</label>
        {conditions.value.map((cond, index) => (
          <div
            key={index}
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <strong>{t('conditional.conditionTitle', { index: index + 1 })}</strong>
              {conditions.value.length > 1 && (
                <button
                  type="button"
                  class="button button--secondary"
                  onClick={() => removeCondition(index)}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                >
                  {t('conditional.remove')}
                </button>
              )}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                {t('conditional.whenLabel')}
              </label>
              <ExpressionEditor
                value={cond.when}
                onChange={(v) => updateCondition(index, 'when', v)}
                placeholder={t('conditional.whenPlaceholder')}
                columns={AppStore.columns.value}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                {t('conditional.thenLabel')}
              </label>
              <ExpressionEditor
                value={cond.then}
                onChange={(v) => updateCondition(index, 'then', v)}
                placeholder={t('conditional.thenPlaceholder')}
                columns={AppStore.columns.value}
              />
            </div>
          </div>
        ))}
        <button type="button" class="button button--secondary" onClick={addCondition}>
          {t('conditional.addCondition')}
        </button>
      </div>

      <div class={styles.group}>
        <label class={styles.label}>{t('conditional.elseLabel')}</label>
        <ExpressionEditor
          value={elseValue.value}
          onChange={(v) => (elseValue.value = v)}
          placeholder={t('conditional.elsePlaceholder')}
          columns={AppStore.columns.value}
        />
        <p class={styles.helpText}>{t('conditional.elseHelp')}</p>
      </div>

      {error.value && (
        <div class={styles.error} style={{ marginTop: '1rem' }}>
          {error.value}
        </div>
      )}
    </div>
  );
}
