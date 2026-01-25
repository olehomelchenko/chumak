/**
 * TextDialog - Preact component for text operations
 */

import { useSignalEffect } from '@preact/signals';
import styles from './TransformDialog.module.css';
import { ColumnSelector } from './column-selector';
import { DialogStore } from '../stores/DialogStore';
import * as TextHandlers from '../handlers/text-handlers';

export function TextDialog() {
  const state = DialogStore.textState;
  const { column, operations, removeOrigin, error } = state;

  const textColumns = TextHandlers.getTextColumns();

  // Update preview when selections change
  useSignalEffect(() => {
    void operations.value;
    // Update if user has made any selections
    if (operations.value.length > 0 && column.value) {
      TextHandlers.updatePreview();
    } else {
      TextHandlers.clearPreview();
    }
  });

  return (
    <div>
      {/* Source Column */}
      <div class={styles.group}>
        <ColumnSelector
          columns={textColumns}
          selectedColumns={column.value}
          onSelectionChange={(col) => (column.value = col as string)}
          mode="single"
          display="chip"
          gridColumns={2}
          label="Source column:"
          helpText={
            textColumns.length === 0
              ? 'No string columns found. Use the column type menu to set a column as string.'
              : undefined
          }
        />
      </div>

      {column.value && (
        <>
          {/* Case Transformation */}
          <div class={styles.group}>
            <label class={styles.label}>Case transformation:</label>
            <table class={styles.dateOptionsTable}>
              <thead>
                <tr>
                  <th style={{ width: '60%' }}>Operation</th>
                  <th style={{ width: '40%' }}>Preview</th>
                </tr>
              </thead>
              <tbody>
                {TextHandlers.getCaseOperations().map((op) => {
                  const isSelected = operations.value.includes(op.value);
                  return (
                    <tr
                      key={op.value}
                      class={`${styles.dateOptionRow} ${!isSelected ? styles.unselected : ''}`}
                    >
                      <td>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name="case-operation"
                            checked={isSelected}
                            onChange={() => TextHandlers.setCaseOperation(op.value)}
                            style={{ margin: 0 }}
                          />
                          <span>{op.label}</span>
                        </label>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.8125rem',
                            color: 'var(--color-dark-gray)',
                            fontFamily: 'var(--font-family-mono)',
                            opacity: !isSelected ? 0.4 : 1,
                          }}
                        >
                          {column.value ? TextHandlers.getTextOperationPreview(op.value) : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {/* None option */}
                <tr
                  class={`${styles.dateOptionRow} ${operations.value.some((op) => ['uppercase', 'lowercase', 'titlecase'].includes(op)) ? styles.unselected : ''}`}
                >
                  <td>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="case-operation"
                        checked={
                          !operations.value.some((op) =>
                            ['uppercase', 'lowercase', 'titlecase'].includes(op)
                          )
                        }
                        onChange={() => TextHandlers.setCaseOperation(null)}
                        style={{ margin: 0 }}
                      />
                      <span>None</span>
                    </label>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--color-dark-gray)',
                        fontFamily: 'var(--font-family-mono)',
                        opacity: 0.4,
                      }}
                    >
                      —
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Trim Whitespace */}
          <div class={styles.group}>
            <label class={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={operations.value.includes('trim')}
                onChange={(e) =>
                  TextHandlers.setTrimOperation((e.target as HTMLInputElement).checked)
                }
              />
              <span>Trim whitespace (remove leading and trailing spaces)</span>
            </label>
          </div>

          {/* Help Section */}
          <div class={styles.expressionHelp} style={{ marginTop: '1rem' }}>
            <div class={styles.expressionHelpTitle} style={{ display: 'block' }}>
              About Operations
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', lineHeight: 1.5 }}>
              Select a case transformation (optional) and/or enable trim whitespace.
              <br />
              <strong>Order:</strong> If both are selected, trim is applied first, then case
              transformation.
            </div>
          </div>

          {/* Remove Origin Column Option */}
          {operations.value.length > 0 && (
            <div class={styles.group}>
              <label class={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={removeOrigin.value}
                  onChange={(e) => (removeOrigin.value = (e.target as HTMLInputElement).checked)}
                />
                <span>Remove origin column after transformation</span>
              </label>
            </div>
          )}
        </>
      )}

      {/* Error message */}
      {error.value && <div class={styles.error}>{error.value}</div>}
    </div>
  );
}
