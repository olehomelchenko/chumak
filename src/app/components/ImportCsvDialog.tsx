import { JSX } from 'preact';
import { DialogStore } from '../stores/DialogStore';

// Props interface kept for reference/testing
export interface ImportCsvDialogProps {
  onJsonPathUpdate?: (path: string) => void;
  onJsonPathReset?: () => void;
  onJsonPathSegmentSelect?: (key: string) => void;
  onParamChange?: () => void;
}

export function ImportCsvDialog({
  onJsonPathUpdate,
  onJsonPathReset,
  onJsonPathSegmentSelect,
  onParamChange,
}: ImportCsvDialogProps = {}) {
  const {
    sourceName,
    isJson,
    jsonPath,
    jsonRawValuePreview,
    suggestedJsonKeys,
    flattenJson,
    serializeNested,
    jsonData,
    delimiter,
    headerMode,
    customHeaders,
    duplicateWarning,
    previewHeaders,
    previewDataRows,
  } = DialogStore.importCsvState;

  const handleJsonPathInput = (e: JSX.TargetedEvent<HTMLInputElement>) => {
    jsonPath.value = e.currentTarget.value;
    if (onJsonPathUpdate) {
      onJsonPathUpdate(e.currentTarget.value);
    }
  };

  const handleDelimiterChange = (val: string) => {
    delimiter.value = val;
    if (onParamChange) {
      onParamChange();
    }
  };

  const handleHeaderModeChange = (val: 'first-row' | 'auto-generate' | 'manual') => {
    headerMode.value = val;
    if (onParamChange) {
      onParamChange();
    }
  };

  const handleHeaderNameChange = (index: number, val: string) => {
    const newHeaders = [...customHeaders.value];
    newHeaders[index] = val;
    customHeaders.value = newHeaders;
    if (onParamChange) {
      onParamChange();
    }
  };

  const handleJsonPathReset = () => {
    if (onJsonPathReset) {
      onJsonPathReset();
    }
  };

  const handleJsonPathSegmentSelect = (key: string) => {
    if (onJsonPathSegmentSelect) {
      onJsonPathSegmentSelect(key);
    }
  };

  return (
    <div className="dialog-content">
      {/* Source Name */}
      <div className="form-group">
        <label className="form-label">Source Name:</label>
        <input
          type="text"
          className="form-input"
          value={sourceName.value}
          onInput={(e) => (sourceName.value = e.currentTarget.value)}
          placeholder="e.g., sales_data"
        />
        <p className="form-help">This name will appear in the Sources panel</p>
      </div>

      {/* JSON Section */}
      {isJson.value && (
        <>
          <div className="form-group">
            <label className="form-label">Data Path (dot notation):</label>
            <input
              type="text"
              className="form-input"
              value={jsonPath.value || ''}
              onInput={handleJsonPathInput}
              placeholder="e.g., results or data.items"
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              <button
                className="button button--secondary button--compact"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={handleJsonPathReset}
                disabled={!jsonPath.value}
              >
                Reset
              </button>
              {suggestedJsonKeys.value.map((key) => (
                <button
                  key={key}
                  className="button button--secondary button--compact"
                  style={{ fontSize: '11px', padding: '4px 8px', borderStyle: 'dashed' }}
                  onClick={() => handleJsonPathSegmentSelect(key)}
                >
                  {key}
                </button>
              ))}
            </div>
            <p className="form-help" style={{ marginTop: '8px' }}>
              Click keys above to navigate or type a path. If the array is nested, specify the path
              to it.
            </p>
            <div
              className="form-help"
              style={{
                marginTop: '4px',
                padding: '8px',
                background: 'var(--color-light-gray)',
                borderRadius: '4px',
                fontSize: '11px',
              }}
            >
              <strong>Examples:</strong>
              <br />• <code>results</code> (if your JSON is <code>{`{ "results": [...] }`}</code>)
              <br />• <code>data.items</code> (if your JSON is{' '}
              <code>{`{ "data": { "items": [...] } }`}</code>)<br />• <code>0.data</code> (if your
              JSON is an array and you want the first element's data)
            </div>
          </div>

          {jsonRawValuePreview.value && (
            <div className="form-group">
              <label className="form-label">Value at path (preview):</label>
              <div className="json-view" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                <pre
                  className="json-view__content"
                  style={{
                    margin: 0,
                    padding: '10px',
                    fontSize: '11px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {jsonRawValuePreview.value}
                </pre>
              </div>
            </div>
          )}

          {jsonRawValuePreview.value && (
            <div className="form-group">
              <label className="form-label" style={{ marginBottom: '8px' }}>
                JSON Options:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={flattenJson.value}
                    onChange={(e) => {
                      flattenJson.value = e.currentTarget.checked;
                      if (onParamChange) {
                        onParamChange();
                      }
                    }}
                  />
                  <span>Flatten nested objects (e.g., user.name -&gt; user_name)</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={serializeNested.value}
                    onChange={(e) => {
                      serializeNested.value = e.currentTarget.checked;
                      if (onParamChange) {
                        onParamChange();
                      }
                    }}
                  />
                  <span>Serialize nested structures to JSON strings</span>
                </label>
              </div>
              <p className="form-help" style={{ marginTop: '4px' }}>
                By default, nested objects are serialized to avoid "[object Object]".
              </p>
            </div>
          )}

          {!jsonData.value && (
            <div className="form-error" style={{ marginBottom: '1rem' }}>
              <span className="iconify" data-icon="carbon:warning"></span>
              <span>No valid array of objects found at this path.</span>
            </div>
          )}
        </>
      )}

      {/* CSV Section */}
      {!isJson.value && (
        <>
          <div className="form-group">
            <label className="form-label">Delimiter:</label>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {[
                { val: ',', label: 'Comma (,)' },
                { val: '\t', label: 'Tab' },
                { val: ';', label: 'Semicolon (;)' },
              ].map((opt) => (
                <label key={opt.val} className="checkbox-item" style={{ margin: 0 }}>
                  <input
                    type="radio"
                    name="delimiter"
                    value={opt.val}
                    checked={delimiter.value === opt.val}
                    onChange={() => handleDelimiterChange(opt.val)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Column Headers:</label>
            {[
              { val: 'first-row', label: 'First row contains headers (recommended)' },
              { val: 'auto-generate', label: 'Auto-generate headers (Column 1, Column 2, ...)' },
              { val: 'manual', label: 'Specify manually' },
            ].map((opt) => (
              <label key={opt.val} className="checkbox-item">
                <input
                  type="radio"
                  name="headerMode"
                  value={opt.val}
                  checked={headerMode.value === opt.val}
                  onChange={() => handleHeaderModeChange(opt.val as any)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {/* Manual Headers Input (CSV Manual OR JSON) */}
      {(headerMode.value === 'manual' || isJson.value) && (
        <div className="form-group" style={{ maxHeight: '150px', overflowY: 'auto' }}>
          <label className="form-label" style={{ fontSize: '13px', marginBottom: '8px' }}>
            Specify column names:
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '8px',
            }}
          >
            {customHeaders.value.map((name, index) => (
              <input
                key={index}
                type="text"
                className="form-input"
                value={name}
                onInput={(e) => handleHeaderNameChange(index, e.currentTarget.value)}
                placeholder={`Column ${index + 1}`}
                style={{ fontSize: '13px', padding: '6px 8px' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Auto-generate message */}
      {headerMode.value === 'auto-generate' && !isJson.value && (
        <div style={{ color: 'var(--color-dark-gray)', fontSize: '14px', padding: '8px 0' }}>
          Columns will be named: Column 1, Column 2, Column 3, ...
        </div>
      )}

      {/* Duplicate Warning */}
      {duplicateWarning.value && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#fff4e5',
            border: '1px solid #ffb020',
            borderRadius: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
            <span style={{ color: '#ffb020', fontSize: '20px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#8b5a00', marginBottom: '0.5rem' }}>
                Duplicate Column Names Detected
              </div>
              <div style={{ fontSize: '13px', color: '#8b5a00', marginBottom: '0.5rem' }}>
                {duplicateWarning.value}
              </div>
              <div style={{ fontSize: '13px', color: '#8b5a00' }}>
                Duplicates have been automatically renamed by adding a suffix (e.g., "_2", "_3").
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Section */}
      <div style={{ marginTop: '1.5rem' }}>
        <label className="form-label">Preview (first 5 rows):</label>
        <div className="preview-table">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                {previewHeaders.value.map((header, index) => (
                  <th key={index} className="data-table__header">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewDataRows.value.map((row, rowIndex) => (
                <tr key={rowIndex} className="data-table__row">
                  {row.map((cell: any, cellIndex: number) => (
                    <td key={cellIndex} className="data-table__cell">
                      {typeof cell === 'object' && cell !== null
                        ? JSON.stringify(cell)
                        : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
