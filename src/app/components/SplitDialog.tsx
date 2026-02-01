/**
 * SplitDialog - Preact component for splitting columns
 */

import { useSignalEffect } from '@preact/signals';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import * as SplitHandlers from '../handlers/transform/split-handlers';
import styles from './TransformDialog.module.css';

// Re-export for backward compatibility
export type { SplitMode } from '../../types/modes';

export function SplitDialog() {
  const {
    column,
    delimiter,
    autoDetectedDelimiter,
    isRegex,
    mode,
    maxColumns,
    keepOriginal,
    error,
  } = DialogStore.splitState;
  const columns = AppStore.columns.value;

  useSignalEffect(() => {
    // Detect delimiter when column changes
    const col = column.value;
    if (col) {
      SplitHandlers.detectDelimiter(col);
    }
  });

  useSignalEffect(() => {
    // Trigger preview when params change
    void column.value;
    void delimiter.value;
    void isRegex.value;
    void mode.value;
    void maxColumns.value;
    void keepOriginal.value;
    if (column.value) {
      SplitHandlers.debouncedUpdateSplitPreview();
    }
  });

  const setPreset = (val: string, regex: boolean) => {
    delimiter.value = val;
    isRegex.value = regex;
  };

  return (
    <div>
      {/* Column Selection */}
      <div class={styles.group}>
        <ColumnSelector
          columns={columns}
          selectedColumns={column.value}
          onSelectionChange={(col) => SplitHandlers.selectSplitColumn(col as string)}
          mode="single"
          display="chip"
          label="Column to split:"
        />
      </div>

      {/* Delimiter */}
      <div class={styles.group}>
        <label class={styles.label}>Delimiter:</label>
        {autoDetectedDelimiter.value && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--color-green)',
              marginBottom: '4px',
            }}
          >
            ✓ Auto-detected: <span>{autoDetectedDelimiter.value}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {[',', ';', '|', '-', '/', '@'].map((d) => (
            <button
              key={d}
              type="button"
              class="button button--secondary"
              style={{ padding: '4px 8px', fontSize: '12px' }}
              onClick={() => setPreset(d, false)}
            >
              {d}
            </button>
          ))}
          {/* Backslash special case */}
          <button
            type="button"
            class="button button--secondary"
            style={{ padding: '4px 8px', fontSize: '12px' }}
            onClick={() => setPreset('\\', false)}
          >
            \
          </button>
          <button
            type="button"
            class="button button--secondary"
            style={{ padding: '4px 12px', fontSize: '12px' }}
            onClick={() => setPreset('\\s+', true)}
            title="Whitespace"
          >
            <span class="iconify" data-icon="material-symbols-light:space-bar-rounded" />
          </button>
          <button
            type="button"
            class="button button--secondary"
            style={{ padding: '4px 12px', fontSize: '12px' }}
            onClick={() => setPreset('\\t', true)}
            title="Tab"
          >
            <span class="iconify" data-icon="material-symbols-light:keyboard-tab-rounded" />
          </button>
        </div>
        <input
          type="text"
          class={styles.input}
          value={delimiter.value}
          onInput={(e) => (delimiter.value = (e.target as HTMLInputElement).value)}
          placeholder="Enter delimiter"
        />
        <div style={{ marginTop: '8px' }}>
          <label class={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isRegex.value}
              onChange={(e) => (isRegex.value = (e.target as HTMLInputElement).checked)}
            />
            <span style={{ fontSize: '13px' }}>
              Use as regex pattern (e.g., <code>\s+</code> for whitespace, <code>[-_]</code> for
              dash or underscore)
            </span>
          </label>
        </div>
      </div>

      {/* Mode */}
      <div class={styles.group}>
        <label class={styles.label}>Split mode:</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label class={styles.checkboxLabel}>
            <input
              type="radio"
              name="splitMode"
              value="spread"
              checked={mode.value === 'spread'}
              onChange={() => (mode.value = 'spread')}
            />
            <span>Spread All - create column for each segment</span>
          </label>
          <label class={styles.checkboxLabel}>
            <input
              type="radio"
              name="splitMode"
              value="left"
              checked={mode.value === 'left'}
              onChange={() => (mode.value = 'left')}
            />
            <span>Keep Left - keep only first segment</span>
          </label>
          <label class={styles.checkboxLabel}>
            <input
              type="radio"
              name="splitMode"
              value="right"
              checked={mode.value === 'right'}
              onChange={() => (mode.value = 'right')}
            />
            <span>Keep Right - keep only last segment</span>
          </label>
          <label class={styles.checkboxLabel}>
            <input
              type="radio"
              name="splitMode"
              value="firstN"
              checked={mode.value === 'firstN'}
              onChange={() => (mode.value = 'firstN')}
            />
            <span>Keep First N - limit number of columns</span>
          </label>
          <label class={styles.checkboxLabel}>
            <input
              type="radio"
              name="splitMode"
              value="lastN"
              checked={mode.value === 'lastN'}
              onChange={() => (mode.value = 'lastN')}
            />
            <span>Keep Last N - keep last N segments</span>
          </label>
        </div>
      </div>

      {/* Max Columns (Conditional) */}
      {(mode.value === 'firstN' || mode.value === 'lastN') && (
        <div class={styles.group}>
          <label class={styles.label}>Max columns:</label>
          <input
            type="number"
            class={styles.input}
            value={maxColumns.value}
            onInput={(e) => {
              const val = (e.target as HTMLInputElement).value;
              maxColumns.value = val ? parseInt(val) : 1;
            }}
            min="1"
            max="50"
            placeholder="e.g., 3"
          />
        </div>
      )}

      {/* Keep Original */}
      <div class={styles.group}>
        <label class={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={keepOriginal.value}
            onChange={(e) => (keepOriginal.value = (e.target as HTMLInputElement).checked)}
          />
          <span>Keep original column</span>
        </label>
      </div>

      {/* Error message */}
      {error.value && <div class={styles.error}>{error.value}</div>}
    </div>
  );
}
