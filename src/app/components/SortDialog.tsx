/**
 * SortDialog - Preact component for the Sort transformation dialog
 *
 * This is the first TSX component migrated from public/templates/sort-modal.html
 */

import { signal, Signal } from '@preact/signals';

export interface SortDialogProps {
  columns: string[];
  field: Signal<string>;
  order: Signal<'asc' | 'desc'>;
}

export function SortDialog({ columns, field, order }: SortDialogProps) {
  return (
    <div class="dialog-content">
      <div class="form-group">
        <label class="form-label">Sort by:</label>
        <div class="column-chips">
          {columns.map((col) => (
            <button
              key={col}
              type="button"
              class={`form-chip ${field.value === col ? 'active' : ''}`}
              style="flex-direction: row; justify-content: start; gap: 0.5rem; padding: 0.5rem 0.75rem"
              onClick={() => (field.value = col)}
            >
              <span
                class="iconify"
                data-icon="carbon:column"
                style="font-size: 1rem; flex-shrink: 0"
              />
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'left',
                  flexGrow: 1,
                }}
              >
                {col}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Order:</label>
        <div style="display: flex; gap: 1rem">
          <label class="radio-label">
            <input
              type="radio"
              name="sort-order"
              checked={order.value === 'asc'}
              onChange={() => (order.value = 'asc')}
            />
            <span>Ascending</span>
          </label>
          <label class="radio-label">
            <input
              type="radio"
              name="sort-order"
              checked={order.value === 'desc'}
              onChange={() => (order.value = 'desc')}
            />
            <span>Descending</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// Factory function to create signals for this dialog
export function createSortDialogState(initialField = '', initialOrder: 'asc' | 'desc' = 'asc') {
  return {
    field: signal(initialField),
    order: signal(initialOrder),
  };
}
