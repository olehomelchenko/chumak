import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import {
  validateRegexpMatchExpression,
  debouncedUpdateRegexpMatchPreview,
} from '../transforms/regexp-transforms';

export function RegexpMatchDialog() {
  const { sourceColumn, pattern, columnName, error } = DialogStore.regexpMatchState;
  const columns = AppStore.columns.value;

  const handleInput = () => {
    validateRegexpMatchExpression();
    debouncedUpdateRegexpMatchPreview();
  };

  return (
    <div class="dialog-content">
      <p class="form-help" style={{ marginBottom: '1rem' }}>
        Creates a boolean column indicating whether the pattern matches.
      </p>

      <div class="form-group">
        <label class="form-label">Source column:</label>
        <div class="column-chips">
          {columns.map((col) => (
            <button
              key={col}
              type="button"
              class={`form-chip ${sourceColumn.value === col ? 'active' : ''}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'start',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
              }}
              onClick={() => {
                sourceColumn.value = col;
                debouncedUpdateRegexpMatchPreview();
              }}
            >
              <span
                class="iconify"
                data-icon="carbon:column"
                style={{ fontSize: '1rem', flexShrink: 0 }}
              ></span>
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
        <label class="form-label">Pattern (regex):</label>
        <input
          type="text"
          class="form-input"
          value={pattern.value}
          onInput={(e) => {
            pattern.value = (e.target as HTMLInputElement).value;
            handleInput();
          }}
          placeholder="e.g., ^[A-Z]{2}\d+"
        />
      </div>

      <div class="form-group">
        <label class="form-label">New column name:</label>
        <input
          type="text"
          class="form-input"
          value={columnName.value}
          onInput={(e) => {
            columnName.value = (e.target as HTMLInputElement).value;
            debouncedUpdateRegexpMatchPreview();
          }}
          placeholder="e.g., is_valid_code"
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

      {/* Help section */}
      <div
        class="derive-help"
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
          <span>Pattern Examples</span>
          <button
            type="button"
            class="button button--text button--small"
            onClick={() => (AppStore.activeDialog.value = 'expressions')}
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
          <div>
            <code
              style={{
                background: 'var(--color-white)',
                padding: '2px 4px',
                borderRadius: '3px',
              }}
            >
              ^[A-Z]{`{2}`}
            </code>
            {' — starts with 2 uppercase letters'}
          </div>
          <div>
            <code
              style={{
                background: 'var(--color-white)',
                padding: '2px 4px',
                borderRadius: '3px',
              }}
            >
              \d{`{3}`}-\d{`{4}`}
            </code>
            {' — phone format 123-4567'}
          </div>
          <div>
            <code
              style={{
                background: 'var(--color-white)',
                padding: '2px 4px',
                borderRadius: '3px',
              }}
            >
              (?i)error
            </code>
            {' — case-insensitive "error"'}
          </div>
          <div>
            <code
              style={{
                background: 'var(--color-white)',
                padding: '2px 4px',
                borderRadius: '3px',
              }}
            >
              @.+\.com$
            </code>
            {' — ends with @...com'}
          </div>
        </div>
      </div>
    </div>
  );
}
