import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import {
  validateRegexpExtractExpression,
  debouncedUpdateRegexpExtractPreview,
} from '../transforms/regexp-transforms';

export function RegexpExtractDialog() {
  const { sourceColumn, pattern, columnName, group, error } = DialogStore.regexpExtractState;
  const columns = AppStore.columns.value;

  const handleInput = () => {
    validateRegexpExtractExpression();
    debouncedUpdateRegexpExtractPreview();
  };

  return (
    <div class="dialog-content">
      <p class="form-help" style={{ marginBottom: '1rem' }}>
        Extracts text matching a pattern into a new column.
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
                debouncedUpdateRegexpExtractPreview();
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
          placeholder="e.g., @(.+)$ to extract domain"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Capture group (0 = entire match):</label>
        <input
          type="number"
          class="form-input"
          value={group.value}
          onInput={(e) => {
            group.value = parseInt((e.target as HTMLInputElement).value) || 0;
            debouncedUpdateRegexpExtractPreview();
          }}
          min="0"
          max="9"
          style={{ width: '80px' }}
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
            debouncedUpdateRegexpExtractPreview();
          }}
          placeholder="e.g., domain"
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
              (\d{`{4}`})-(\d{`{2}`})-(\d{`{2}`})
            </code>
            {' — date parts (1=year, 2=month, 3=day)'}
          </div>
          <div>
            <code
              style={{
                background: 'var(--color-white)',
                padding: '2px 4px',
                borderRadius: '3px',
              }}
            >
              @(.+)$
            </code>
            {' — domain from email (group 1)'}
          </div>
          <div>
            <code
              style={{
                background: 'var(--color-white)',
                padding: '2px 4px',
                borderRadius: '3px',
              }}
            >
              (?i)(error|warning)
            </code>
            {' — extract level (case-insensitive)'}
          </div>
          <div>
            <code
              style={{
                background: 'var(--color-white)',
                padding: '2px 4px',
                borderRadius: '3px',
              }}
            >
              ^([A-Z]{`{2}`})
            </code>
            {' — first 2 uppercase letters'}
          </div>
        </div>
      </div>
    </div>
  );
}
