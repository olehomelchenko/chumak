import { computed } from '@preact/signals';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import styles from './TransformDialog.module.css';

export function IndexDialog() {
  const { columnName, startFrom } = DialogStore.indexState;
  const rowCount = AppStore.currentData.value?.length || 0;
  const endValue = computed(() => (startFrom.value || 0) + rowCount - 1);
  const displayName = computed(() => columnName.value || 'row_index');

  return (
    <div>
      <div class={styles.group}>
        <label class={styles.label}>Column name:</label>
        <input
          type="text"
          class={styles.input}
          value={columnName.value}
          onInput={(e) => (columnName.value = (e.target as HTMLInputElement).value)}
          placeholder="row_index"
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>Start from:</label>
        <input
          type="number"
          class={styles.input}
          value={startFrom.value}
          onInput={(e) => (startFrom.value = parseInt((e.target as HTMLInputElement).value) || 0)}
          min="0"
          placeholder="1"
        />
      </div>

      <div class={`${styles.group} ${styles.expressionHelp}`}>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-dark-gray)' }}>
          Will add column "<strong>{displayName}</strong>" with values <strong>{startFrom}</strong>{' '}
          to <strong>{endValue}</strong>
        </span>
      </div>
    </div>
  );
}
