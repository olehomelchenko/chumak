/**
 * IndexDialog - Preact component for the Add Index Column dialog
 */

import { Signal, computed } from '@preact/signals';

export interface IndexDialogProps {
  columnName: Signal<string>;
  startFrom: Signal<number>;
  rowCount: number;
}

export function IndexDialog({ columnName, startFrom, rowCount }: IndexDialogProps) {
  const endValue = computed(() => (startFrom.value || 0) + rowCount - 1);
  const displayName = computed(() => columnName.value || 'row_index');

  return (
    <div class="dialog-content">
      <div class="form-group">
        <label class="form-label">Column name:</label>
        <input
          type="text"
          class="form-input"
          value={columnName.value}
          onInput={(e) => (columnName.value = (e.target as HTMLInputElement).value)}
          placeholder="row_index"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Start from:</label>
        <input
          type="number"
          class="form-input"
          value={startFrom.value}
          onInput={(e) => (startFrom.value = parseInt((e.target as HTMLInputElement).value) || 0)}
          min="0"
          placeholder="1"
        />
      </div>

      <div
        class="form-group"
        style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'var(--color-light-gray)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <span style={{ fontSize: '0.875rem', color: 'var(--color-dark-gray)' }}>
          Will add column "<strong>{displayName}</strong>" with values <strong>{startFrom}</strong>{' '}
          to <strong>{endValue}</strong>
        </span>
      </div>
    </div>
  );
}
