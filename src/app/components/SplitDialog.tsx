/**
 * SplitDialog - Preact component for splitting columns
 */

import { signal, useSignalEffect } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { useDialogState } from '../hooks/useDialogState';
import { useTransformPreview } from '../hooks/useTransformPreview';
import { detectDelimiter, applySplitPreview } from '../handlers/transform/split-handlers';
import { validateRegexPattern } from '../handlers/validation-engine';
import { ColumnSelector } from './column-selector';
import type { SplitMode } from '../../types/modes';
import styles from './form-controls.module.css';

export function SplitDialog() {
  const { t } = useTranslation('dialogs');
  const columns = AppStore.columns.value;

  const { state } = useDialogState(
    (ctx) => {
      const editing = ctx.editingStep?.split;
      const quickColumn = AppStore.selectedColumn.value;
      const initialColumn = (editing as any)?.column ?? quickColumn ?? ctx.columns[0] ?? '';

      let delimiter = (editing as any)?.delimiter ?? ',';
      let isRegex = !!(editing as any)?.isRegex;
      let autoDetected: string | null = null;

      // Auto-detect delimiter for new dialogs when a column is pre-selected
      if (!editing && initialColumn) {
        const detected = detectDelimiter(initialColumn);
        if (detected) {
          delimiter = detected.char;
          isRegex = detected.isRegex;
          autoDetected = detected.name;
        }
      }

      return {
        column: signal(initialColumn),
        delimiter: signal(delimiter),
        isRegex: signal(isRegex),
        mode: signal<SplitMode>((editing as any)?.mode ?? 'spread'),
        maxColumns: signal((editing as any)?.maxColumns ?? 10),
        keepOriginal: signal(!!(editing as any)?.keepOriginal),
        error: signal<string | null>(null),
        autoDetectedDelimiter: signal<string | null>(autoDetected),
      };
    },
    {
      hasError: (s) => !!s.error.value,
      getError: (s) => s.error.value,
      getState: (s) => ({
        column: s.column.value,
        delimiter: s.delimiter.value,
        isRegex: s.isRegex.value,
        mode: s.mode.value,
        maxColumns: s.maxColumns.value,
        keepOriginal: s.keepOriginal.value,
      }),
    }
  );

  const {
    column,
    delimiter,
    autoDetectedDelimiter,
    isRegex,
    mode,
    maxColumns,
    keepOriginal,
    error,
  } = state;

  // Re-detect delimiter when column changes
  useSignalEffect(() => {
    const col = column.value;
    if (col) {
      const detected = detectDelimiter(col);
      if (detected) {
        delimiter.value = detected.char;
        isRegex.value = detected.isRegex;
        autoDetectedDelimiter.value = detected.name;
      } else {
        autoDetectedDelimiter.value = null;
      }
    }
  });

  // Inline regex validation
  useSignalEffect(() => {
    void delimiter.value;
    void isRegex.value;
    if (isRegex.value && delimiter.value) {
      const validation = validateRegexPattern(delimiter.value);
      error.value = validation.valid ? null : (validation.error ?? null);
    } else {
      error.value = null;
    }
  });

  useTransformPreview({
    deps: () => {
      column.value;
      delimiter.value;
      isRegex.value;
      mode.value;
      maxColumns.value;
      keepOriginal.value;
      error.value;
    },
    compute: () => {
      if (!column.value || !delimiter.value || error.value) return null;
      return applySplitPreview(
        column.value,
        delimiter.value,
        isRegex.value,
        mode.value,
        maxColumns.value,
        keepOriginal.value
      );
    },
    onError: (err) => {
      error.value = err.message;
    },
  });

  const selectColumn = (col: string) => {
    column.value = col;
  };

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
          onSelectionChange={(col) => selectColumn(col as string)}
          mode="single"
          display="chip"
          label={t('split.columnLabel')}
        />
      </div>

      {/* Delimiter */}
      <div class={styles.group}>
        <label class={styles.label}>{t('split.delimiterLabel')}</label>
        {autoDetectedDelimiter.value && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--color-green)',
              marginBottom: '4px',
            }}
          >
            ✓ {t('split.autoDetected', { delimiter: autoDetectedDelimiter.value })}
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
            title={t('split.presetTitles.whitespace')}
          >
            <span
              class="iconify"
              aria-hidden="true"
              data-icon="material-symbols-light:space-bar-rounded"
            />
          </button>
          <button
            type="button"
            class="button button--secondary"
            style={{ padding: '4px 12px', fontSize: '12px' }}
            onClick={() => setPreset('\\t', true)}
            title={t('split.presetTitles.tab')}
          >
            <span
              class="iconify"
              aria-hidden="true"
              data-icon="material-symbols-light:keyboard-tab-rounded"
            />
          </button>
        </div>
        <input
          type="text"
          class={styles.input}
          value={delimiter.value}
          onInput={(e) => (delimiter.value = (e.target as HTMLInputElement).value)}
          placeholder={t('split.delimiterPlaceholder')}
        />
        <div style={{ marginTop: '8px' }}>
          <label class={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isRegex.value}
              onChange={(e) => (isRegex.value = (e.target as HTMLInputElement).checked)}
            />
            <span style={{ fontSize: '13px' }}>{t('split.useRegex')}</span>
          </label>
        </div>
      </div>

      {/* Mode */}
      <div class={styles.group}>
        <label class={styles.label}>{t('split.modeLabel')}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label class={styles.checkboxLabel}>
            <input
              type="radio"
              name="splitMode"
              value="spread"
              checked={mode.value === 'spread'}
              onChange={() => (mode.value = 'spread')}
            />
            <span>{t('split.modes.spread')}</span>
          </label>
          <label class={styles.checkboxLabel}>
            <input
              type="radio"
              name="splitMode"
              value="left"
              checked={mode.value === 'left'}
              onChange={() => (mode.value = 'left')}
            />
            <span>{t('split.modes.left')}</span>
          </label>
          <label class={styles.checkboxLabel}>
            <input
              type="radio"
              name="splitMode"
              value="right"
              checked={mode.value === 'right'}
              onChange={() => (mode.value = 'right')}
            />
            <span>{t('split.modes.right')}</span>
          </label>
          <label class={styles.checkboxLabel}>
            <input
              type="radio"
              name="splitMode"
              value="firstN"
              checked={mode.value === 'firstN'}
              onChange={() => (mode.value = 'firstN')}
            />
            <span>{t('split.modes.firstN')}</span>
          </label>
          <label class={styles.checkboxLabel}>
            <input
              type="radio"
              name="splitMode"
              value="lastN"
              checked={mode.value === 'lastN'}
              onChange={() => (mode.value = 'lastN')}
            />
            <span>{t('split.modes.lastN')}</span>
          </label>
        </div>
      </div>

      {/* Max Columns (Conditional) */}
      {(mode.value === 'firstN' || mode.value === 'lastN') && (
        <div class={styles.group}>
          <label class={styles.label}>{t('split.maxColumnsLabel')}</label>
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
            placeholder={t('split.maxColumnsPlaceholder')}
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
          <span>{t('split.keepOriginal')}</span>
        </label>
      </div>

      {/* Error message */}
      {error.value && <div class={styles.error}>{error.value}</div>}
    </div>
  );
}
