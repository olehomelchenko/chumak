/**
 * SplitDialog - Preact component for splitting columns
 */

import { Signal } from '@preact/signals';

export type SplitMode = 'spread' | 'left' | 'right' | 'firstN' | 'lastN';

export interface SplitDialogProps {
  columns: string[];
  column: Signal<string>;
  delimiter: Signal<string>;
  autoDetectedDelimiter: Signal<string | null>;
  isRegex: Signal<boolean>;
  mode: Signal<SplitMode>;
  maxColumns: Signal<number>;
  keepOriginal: Signal<boolean>;
  error: Signal<string | null>;
}

export function SplitDialog({
  columns,
  column,
  delimiter,
  autoDetectedDelimiter,
  isRegex,
  mode,
  maxColumns,
  keepOriginal,
  error,
}: SplitDialogProps) {
  const setPreset = (val: string, regex: boolean) => {
    delimiter.value = val;
    isRegex.value = regex;
  };

  return (
    <div class="dialog-content">
      {/* Column Selection */}
      <div class="form-group">
        <label class="form-label">Column to split:</label>
        <div class="column-chips">
          {columns.map((col) => (
            <button
              key={col}
              type="button"
              class={`form-chip ${column.value === col ? 'active' : ''}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'start',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
              }}
              onClick={() => (column.value = col)}
            >
              <span class="iconify" data-icon="carbon:column" />
              <span>{col}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Delimiter */}
      <div class="form-group">
        <label class="form-label">Delimiter:</label>
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
          class="form-input"
          value={delimiter.value}
          onInput={(e) => (delimiter.value = (e.target as HTMLInputElement).value)}
          placeholder="Enter delimiter"
        />
        <div style={{ marginTop: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
      <div class="form-group">
        <label class="form-label">Split mode:</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="radio"
              name="splitMode"
              value="spread"
              checked={mode.value === 'spread'}
              onChange={() => (mode.value = 'spread')}
            />
            <span>Spread All - create column for each segment</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="radio"
              name="splitMode"
              value="left"
              checked={mode.value === 'left'}
              onChange={() => (mode.value = 'left')}
            />
            <span>Keep Left - keep only first segment</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="radio"
              name="splitMode"
              value="right"
              checked={mode.value === 'right'}
              onChange={() => (mode.value = 'right')}
            />
            <span>Keep Right - keep only last segment</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="radio"
              name="splitMode"
              value="firstN"
              checked={mode.value === 'firstN'}
              onChange={() => (mode.value = 'firstN')}
            />
            <span>Keep First N - limit number of columns</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        <div class="form-group">
          <label class="form-label">Max columns:</label>
          <input
            type="number"
            class="form-input"
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
      <div class="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={keepOriginal.value}
            onChange={(e) => (keepOriginal.value = (e.target as HTMLInputElement).checked)}
          />
          <span>Keep original column</span>
        </label>
      </div>

      {/* Error message */}
      {error.value && (
        <div
          style={{
            color: 'var(--color-red)',
            fontSize: '13px',
            marginTop: '8px',
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-family-mono)',
          }}
        >
          {error.value}
        </div>
      )}
    </div>
  );
}
