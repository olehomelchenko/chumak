/**
 * FilterDialog - Preact component for filtering rows
 */

import { Signal } from '@preact/signals';

export type FilterPreviewMode = 'all' | 'matching';

export interface FilterDialogProps {
  expression: Signal<string>;
  error: Signal<string | null>;
  previewMode: Signal<FilterPreviewMode>;
  onOpenReference: () => void;
}

export function FilterDialog({
  expression,
  error,
  previewMode,
  onOpenReference,
}: FilterDialogProps) {
  return (
    <div class="dialog-content">
      <label class="form-label">Keep rows where:</label>
      <input
        type="text"
        class="form-input"
        value={expression.value}
        onInput={(e) => (expression.value = (e.target as HTMLInputElement).value)}
        placeholder="e.g., sales > 1000"
      />

      {/* Preview mode toggle */}
      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-dark-gray)' }}>Preview:</span>
        <button
          type="button"
          class={`button button--small ${previewMode.value === 'all' ? 'button--primary' : 'button--text'}`}
          onClick={() => (previewMode.value = 'all')}
        >
          Show All
        </button>
        <button
          type="button"
          class={`button button--small ${previewMode.value === 'matching' ? 'button--primary' : 'button--text'}`}
          onClick={() => (previewMode.value = 'matching')}
        >
          Matching Only
        </button>
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

      {/* Quick Examples */}
      <div
        class="expression-help"
        style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'var(--color-soft-bg)',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.8rem',
            color: 'var(--color-dark-gray)',
            marginBottom: '0.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Quick Examples</span>
          <button
            type="button"
            class="button button--text button--small"
            onClick={onOpenReference}
            style={{ fontWeight: 500, textDecoration: 'underline' }}
          >
            Full Reference
          </button>
        </div>

        <div
          style={{
            fontSize: '0.75rem',
            fontFamily: 'var(--font-family-mono)',
            color: 'var(--color-text)',
            lineHeight: 1.8,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1rem' }}>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                }}
              >
                sales {'>'} 1000
              </code>
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                }}
              >
                price {'<='} 100
              </code>
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                }}
              >
                region == "North"
              </code>
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                }}
              >
                status != "cancelled"
              </code>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                }}
              >
                sales {'>'} 1000 && region == "North"
              </code>
              {' — combine with AND'}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                }}
              >
                status == "pending" || status == "review"
              </code>
              {' — combine with OR'}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                }}
              >
                year(order_date) == 2024
              </code>
              {' — date functions'}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                }}
              >
                regexp_match(email, "@gmail\\.com$")
              </code>
              {' — regex patterns'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
