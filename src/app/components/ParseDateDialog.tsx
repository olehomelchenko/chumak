/**
 * ParseDateDialog - Parse date strings into date values using a format pattern
 */

import { useSignalEffect } from '@preact/signals';
import styles from './TransformDialog.module.css';
import { ColumnSelector } from './column-selector';
import { DialogStore } from '../stores/DialogStore';
import * as ParseDateHandlers from '../handlers/transform/parse-date-handlers';

export function ParseDateDialog() {
  const state = DialogStore.parseDateState;
  const { column, format, error } = state;

  const stringColumns = ParseDateHandlers.getStringColumns();
  const commonFormats = ParseDateHandlers.getCommonFormats();

  // Update preview when column or format changes
  useSignalEffect(() => {
    void column.value;
    void format.value;
    if (column.value && format.value) {
      ParseDateHandlers.updateParseDatePreview();
    } else {
      ParseDateHandlers.clearParseDatePreview();
    }
  });

  const sampleValue = column.value ? ParseDateHandlers.getSampleValue() : '';

  return (
    <div>
      {/* Source Column */}
      <div class={styles.group}>
        <ColumnSelector
          columns={stringColumns}
          selectedColumns={column.value}
          onSelectionChange={(col) => (column.value = col as string)}
          mode="single"
          display="chip"
          gridColumns={2}
          label="Source column:"
          helpText={stringColumns.length === 0 ? 'No string columns found.' : undefined}
        />
      </div>

      {column.value && (
        <>
          {/* Sample value hint */}
          {sampleValue && (
            <div class={styles.group}>
              <div class={styles.expressionHelp} style={{ marginTop: 0 }}>
                <div class={styles.expressionHelpTitle} style={{ display: 'block' }}>
                  Sample value
                </div>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    fontFamily: 'var(--font-family-mono)',
                    color: 'var(--color-text)',
                  }}
                >
                  {sampleValue}
                </div>
              </div>
            </div>
          )}

          {/* Format presets */}
          <div class={styles.group}>
            <label class={styles.label}>Format:</label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.375rem',
                marginBottom: '0.75rem',
              }}
            >
              {commonFormats.map((fmt) => (
                <button
                  key={fmt.value}
                  type="button"
                  class={`${styles.toggleButton} ${format.value === fmt.value ? styles.active : ''}`}
                  style={{ justifyContent: 'center', fontSize: '0.75rem' }}
                  onClick={() => (format.value = fmt.value)}
                  title={`Example: ${fmt.example}`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            {/* Custom format input */}
            <input
              type="text"
              class={styles.input}
              placeholder="Or type a custom format..."
              value={format.value}
              onInput={(e) => (format.value = (e.target as HTMLInputElement).value)}
            />
            <div class={styles.helpText}>Tokens: YYYY, YY, MM, M, DD, D, HH, H, mm, m, ss, s</div>
          </div>
        </>
      )}

      {/* Error message */}
      {error.value && <div class={styles.error}>{error.value}</div>}
    </div>
  );
}
