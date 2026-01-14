import { Signal } from '@preact/signals';
import { JSX } from 'preact';

export interface DeriveDialogProps {
  columnName: Signal<string>;
  expression: Signal<string>;
  error: Signal<string | null>;
  onOpenReference: () => void;
}

export function DeriveDialog({
  columnName,
  expression,
  error,
  onOpenReference,
}: DeriveDialogProps) {
  const handleColumnNameInput = (e: JSX.TargetedEvent<HTMLInputElement>) => {
    columnName.value = e.currentTarget.value;
  };

  const handleExpressionInput = (e: JSX.TargetedEvent<HTMLInputElement>) => {
    expression.value = e.currentTarget.value;
  };

  return (
    <div className="dialog-content">
      <div className="form-group">
        <label className="form-label">New column name:</label>
        <input
          type="text"
          className="form-input"
          value={columnName}
          onInput={handleColumnNameInput}
          placeholder="e.g., profit_margin"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Expression:</label>
        <input
          type="text"
          className="form-input"
          value={expression}
          onInput={handleExpressionInput}
          placeholder="e.g., (profit / sales) * 100"
        />
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

      {/* Expression Help Section */}
      <div
        className="derive-help"
        style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'var(--color-soft-bg)',
          borderRadius: '6px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div
          className="derive-help__title"
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
          <span>Expression Syntax Guide</span>
          <button
            type="button"
            className="button button--text button--small"
            onClick={onOpenReference}
            style={{ fontWeight: 500, textDecoration: 'underline' }}
          >
            Full Reference
          </button>
        </div>

        {/* Supported Examples */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--color-dark-gray)',
              marginBottom: '0.25rem',
            }}
          >
            Examples:
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-family-mono)',
              color: 'var(--color-text)',
              lineHeight: 1.6,
            }}
          >
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                }}
              >
                revenue - cost
              </code>
              — subtraction
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                }}
              >
                price * quantity
              </code>
              — multiplication
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                }}
              >
                (profit / sales) * 100
              </code>
              — percentage
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                }}
              >
                profit {'>'} 0 ? "Gain" : "Loss"
              </code>
              — conditional
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                }}
              >
                discount ?? 0
              </code>
              — default for null
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                }}
              >
                [Total Sales] + [Tax]
              </code>
              — columns with spaces
            </div>
          </div>
        </div>

        {/* Supported Operators */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--color-dark-gray)',
              marginBottom: '0.25rem',
            }}
          >
            Supported Operators:
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--color-medium-gray)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span
              style={{
                background: 'var(--color-white)',
                padding: '2px 6px',
                borderRadius: '3px',
                border: '1px solid var(--border-color)',
              }}
            >
              + − * / %
            </span>
            <span
              style={{
                background: 'var(--color-white)',
                padding: '2px 6px',
                borderRadius: '3px',
                border: '1px solid var(--border-color)',
              }}
            >
              &gt; &lt; &gt;= &lt;= == !=
            </span>
            <span
              style={{
                background: 'var(--color-white)',
                padding: '2px 6px',
                borderRadius: '3px',
                border: '1px solid var(--border-color)',
              }}
            >
              && || ! ??
            </span>
            <span
              style={{
                background: 'var(--color-white)',
                padding: '2px 6px',
                borderRadius: '3px',
                border: '1px solid var(--border-color)',
              }}
            >
              ? : ( )
            </span>
          </div>
        </div>

        {/* Available Functions */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--color-dark-gray)',
              marginBottom: '0.25rem',
            }}
          >
            Date Functions:
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              fontFamily: 'var(--font-family-mono)',
              color: 'var(--color-text)',
              lineHeight: 1.5,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.25rem 1rem',
            }}
          >
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '1px 3px',
                  borderRadius: '3px',
                }}
              >
                year(d)
              </code>
              — 2024
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '1px 3px',
                  borderRadius: '3px',
                }}
              >
                month(d)
              </code>
              — 1-12
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '1px 3px',
                  borderRadius: '3px',
                }}
              >
                day(d)
              </code>
              — 1-31
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '1px 3px',
                  borderRadius: '3px',
                }}
              >
                weekday(d)
              </code>
              — 0-6 (Mon-Sun)
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '1px 3px',
                  borderRadius: '3px',
                }}
              >
                quarter(d)
              </code>
              — 1-4
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '1px 3px',
                  borderRadius: '3px',
                }}
              >
                week(d)
              </code>
              — ISO week
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '1px 3px',
                  borderRadius: '3px',
                }}
              >
                hour(d)
              </code>
              — 0-23
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '1px 3px',
                  borderRadius: '3px',
                }}
              >
                minute(d)
              </code>
              — 0-59
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '1px 3px',
                  borderRadius: '3px',
                }}
              >
                today()
              </code>
              — current date
            </div>
            <div>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '1px 3px',
                  borderRadius: '3px',
                }}
              >
                now()
              </code>
              — current time
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '1px 3px',
                  borderRadius: '3px',
                }}
              >
                days_between(d1, d2)
              </code>
              — difference in days
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '1px 3px',
                  borderRadius: '3px',
                }}
              >
                date_add(d, n, "days")
              </code>
              — add days/months/years
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <code
                style={{
                  background: 'var(--color-white)',
                  padding: '1px 3px',
                  borderRadius: '3px',
                }}
              >
                format_date(d, "DD/MM/YYYY")
              </code>
              — custom format
            </div>
          </div>
        </div>

        {/* Text Functions */}
        <div
          style={{
            fontSize: '0.7rem',
            color: 'var(--color-medium-gray)',
            borderTop: '1px dashed var(--border-color)',
            paddingTop: '0.5rem',
          }}
        >
          <strong style={{ color: 'var(--color-dark-gray)' }}>Text:</strong>{' '}
          <code style={{ fontSize: '0.7rem' }}>regexp_match(val, pattern)</code>,{' '}
          <code style={{ fontSize: '0.7rem' }}>regexp_extract(val, pattern)</code>
        </div>
      </div>
    </div>
  );
}
