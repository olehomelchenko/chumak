/**
 * ReplaceDialog - Preact component for the Replace Values dialog
 */

import { Signal } from '@preact/signals';

export interface ReplaceDialogProps {
  columns: string[];
  column: Signal<string>;
  findValue: Signal<string>;
  replaceValue: Signal<string>;
}

export function ReplaceDialog({ columns, column, findValue, replaceValue }: ReplaceDialogProps) {
  return (
    <div class="dialog-content">
      <div class="form-group">
        <label class="form-label">Column:</label>
        <div class="column-chips">
          {columns.map((col) => (
            <button
              key={col}
              type="button"
              class={`form-chip ${column.value === col ? 'active' : ''}`}
              style="flex-direction: row; justify-content: start; gap: 0.5rem; padding: 0.5rem 0.75rem"
              onClick={() => (column.value = col)}
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
        <label class="form-label">Find value:</label>
        <input
          type="text"
          class="form-input"
          value={findValue.value}
          onInput={(e) => (findValue.value = (e.target as HTMLInputElement).value)}
          placeholder="Value to replace"
        />
        <p class="form-help">The exact value to find and replace</p>
      </div>

      <div class="form-group">
        <label class="form-label">Replace with:</label>
        <input
          type="text"
          class="form-input"
          value={replaceValue.value}
          onInput={(e) => (replaceValue.value = (e.target as HTMLInputElement).value)}
          placeholder="New value (leave empty for null)"
        />
        <p class="form-help">New value to use (leave empty to replace with null)</p>
      </div>
    </div>
  );
}
