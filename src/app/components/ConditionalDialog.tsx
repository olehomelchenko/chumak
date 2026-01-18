import { DialogStore } from '../stores/DialogStore';
import styles from './TransformDialog.module.css';

export function ConditionalDialog() {
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
        Create a column based on multiple conditions. Conditions are evaluated in order, and the
        first matching condition's value is used.
      </p>

      <div class={styles.group}>
        <label class={styles.label}>Output column name:</label>
        <input
          type="text"
          class={styles.input}
          value={column.value}
          onInput={(e) => (column.value = (e.target as HTMLInputElement).value)}
          placeholder="e.g., tier"
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>Conditions:</label>
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
              <strong>Condition {index + 1}</strong>
              {conditions.value.length > 1 && (
                <button
                  type="button"
                  class="button button--secondary"
                  onClick={() => removeCondition(index)}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                >
                  Remove
                </button>
              )}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                When (expression):
              </label>
              <input
                type="text"
                class={styles.input}
                value={cond.when}
                onInput={(e) =>
                  updateCondition(index, 'when', (e.target as HTMLInputElement).value)
                }
                placeholder="e.g., sales > 10000"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                Then (expression):
              </label>
              <input
                type="text"
                class={styles.input}
                value={cond.then}
                onInput={(e) =>
                  updateCondition(index, 'then', (e.target as HTMLInputElement).value)
                }
                placeholder="e.g., 'platinum'"
              />
            </div>
          </div>
        ))}
        <button type="button" class="button button--secondary" onClick={addCondition}>
          Add Condition
        </button>
      </div>

      <div class={styles.group}>
        <label class={styles.label}>Else (default value):</label>
        <input
          type="text"
          class={styles.input}
          value={elseValue.value}
          onInput={(e) => (elseValue.value = (e.target as HTMLInputElement).value)}
          placeholder="e.g., 'bronze'"
        />
        <p class={styles.helpText}>Value used when no conditions match</p>
      </div>

      {error.value && (
        <div class={styles.error} style={{ marginTop: '1rem' }}>
          {error.value}
        </div>
      )}
    </div>
  );
}
