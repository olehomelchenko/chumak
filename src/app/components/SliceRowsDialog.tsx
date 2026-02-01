import { computed } from '@preact/signals';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import styles from './TransformDialog.module.css';

// Re-export for backward compatibility
export type { SliceMode } from '../../types/modes';

export function SliceRowsDialog() {
  const { count, mode } = DialogStore.sliceRowsState;
  const rowCount = AppStore.currentData.value?.length || 0;
  // Computed values for the preview text
  const previewText = computed(() => {
    const n = count.value || 0;
    const total = rowCount || 0;

    switch (mode.value) {
      case 'first': {
        const end = Math.min(n, total);
        return (
          <>
            Will keep rows 1 to <strong>{end}</strong>
          </>
        );
      }
      case 'last': {
        const start = Math.max(1, total - n + 1);
        return (
          <>
            Will keep rows <strong>{start}</strong> to <strong>{total}</strong>
          </>
        );
      }
      case 'removeFirst': {
        const end = Math.min(n, total);
        return (
          <>
            Will remove rows 1 to <strong>{end}</strong>
          </>
        );
      }
      case 'removeLast': {
        const start = Math.max(1, total - n + 1);
        return (
          <>
            Will remove rows <strong>{start}</strong> to <strong>{total}</strong>
          </>
        );
      }
      default:
        return null;
    }
  });

  return (
    <div>
      <div class={styles.group}>
        <label class={styles.label}>Number of rows:</label>
        <input
          type="number"
          class={styles.input}
          value={count.value}
          onInput={(e) => (count.value = parseInt((e.target as HTMLInputElement).value) || 0)}
          min="1"
          placeholder="10"
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>Mode:</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label class={styles.radioLabel}>
            <input
              type="radio"
              checked={mode.value === 'first'}
              onChange={() => (mode.value = 'first')}
            />
            <span>Keep first N rows</span>
          </label>
          <label class={styles.radioLabel}>
            <input
              type="radio"
              checked={mode.value === 'last'}
              onChange={() => (mode.value = 'last')}
            />
            <span>Keep last N rows</span>
          </label>
          <label class={styles.radioLabel}>
            <input
              type="radio"
              checked={mode.value === 'removeFirst'}
              onChange={() => (mode.value = 'removeFirst')}
            />
            <span>Remove first N rows</span>
          </label>
          <label class={styles.radioLabel}>
            <input
              type="radio"
              checked={mode.value === 'removeLast'}
              onChange={() => (mode.value = 'removeLast')}
            />
            <span>Remove last N rows</span>
          </label>
        </div>
      </div>

      <div class={styles.expressionHelp}>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-dark-gray)' }}>
          {previewText.value}
          <span style={{ marginLeft: '0.5rem', color: 'var(--color-medium-gray)' }}>
            (of {rowCount.toLocaleString()} total rows)
          </span>
        </span>
      </div>
    </div>
  );
}
