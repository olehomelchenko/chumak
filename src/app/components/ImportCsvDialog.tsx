import { JSX } from 'preact';
import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import { SchemaDiffPanel } from './SchemaDiffPanel';
import styles from './TransformDialog.module.css';

// Props interface kept for reference/testing
export interface ImportCsvDialogProps {
  onJsonPathUpdate?: (path: string) => void;
  onJsonPathReset?: () => void;
  onJsonPathSegmentSelect?: (key: string) => void;
  onParamChange?: () => void;
  onBackToUrl?: () => void;
  onBackToText?: () => void;
}

export function ImportCsvDialog({
  onJsonPathUpdate,
  onJsonPathReset,
  onJsonPathSegmentSelect,
  onParamChange,
  onBackToUrl,
  onBackToText,
}: ImportCsvDialogProps = {}) {
  const { t } = useTranslation('common');
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
    isReplaceMode,
    schemaDiff,
    fromUrlImport,
    fromTextEntry,
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
    <div>
      {fromUrlImport.value && onBackToUrl && (
        <button class={styles.backLink} onClick={onBackToUrl}>
          <span class="iconify" data-icon="carbon:arrow-left" style={{ fontSize: '14px' }}></span>
          {t('buttons.backToDatasets')}
        </button>
      )}
      {fromTextEntry.value && onBackToText && (
        <button class={styles.backLink} onClick={onBackToText}>
          <span class="iconify" data-icon="carbon:arrow-left" style={{ fontSize: '14px' }}></span>
          {t('buttons.backToTextEntry')}
        </button>
      )}

      {/* Replace Mode Banner */}
      {isReplaceMode.value && (
        <div class={styles.replaceBanner}>
          <span
            class={`iconify ${styles.replaceIcon}`}
            data-icon="carbon:cyclostat"
            style={{ fontSize: '24px' }}
          ></span>
          <div class={styles.replaceInfo}>
            <strong>Replace Mode</strong>
            <p>
              You are replacing data in source: <em>{sourceName.value}</em>
            </p>
          </div>
        </div>
      )}

      {/* Schema Diff Panel */}
      {isReplaceMode.value && schemaDiff.value && <SchemaDiffPanel diff={schemaDiff.value} />}

      {/* Source Name */}
      <div class={styles.group}>
        <label class={styles.label}>Source Name:</label>
        <input
          type="text"
          class={styles.input}
          value={sourceName.value}
          onInput={(e) => (sourceName.value = e.currentTarget.value)}
          placeholder="e.g., sales_data"
        />
        <p class={styles.helpText}>This name will appear in the Sources panel</p>
      </div>

      {/* JSON Section */}
      {isJson.value && (
        <>
          <div class={styles.group}>
            <label class={styles.label}>Data Path (dot notation):</label>
            <input
              type="text"
              class={styles.input}
              value={jsonPath.value || ''}
              onInput={handleJsonPathInput}
              placeholder="e.g., results or data.items"
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              <button
                class="button button--secondary button--compact"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={handleJsonPathReset}
                disabled={!jsonPath.value}
              >
                Reset
              </button>
              {suggestedJsonKeys.value.map((key) => (
                <button
                  key={key}
                  class="button button--secondary button--compact"
                  style={{ fontSize: '11px', padding: '4px 8px', borderStyle: 'dashed' }}
                  onClick={() => handleJsonPathSegmentSelect(key)}
                >
                  {key}
                </button>
              ))}
            </div>
            <p class={styles.helpText} style={{ marginTop: '8px' }}>
              Click keys above to navigate or type a path. If the array is nested, specify the path
              to it.
            </p>
            <div
              class={styles.helpText}
              style={{
                marginTop: '4px',
                padding: '8px',
                background: 'var(--color-soft-bg)',
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
            <div class={styles.group}>
              <label class={styles.label}>Value at path (preview):</label>
              <div class={styles.jsonView}>
                <pre class={styles.jsonViewContent}>{jsonRawValuePreview.value}</pre>
              </div>
            </div>
          )}

          {jsonRawValuePreview.value && (
            <div class={styles.group}>
              <label class={styles.label} style={{ marginBottom: '8px' }}>
                JSON Options:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label class={styles.checkboxLabel}>
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
                <label class={styles.checkboxLabel}>
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
              <p class={styles.helpText} style={{ marginTop: '4px' }}>
                By default, nested objects are serialized to avoid "[object Object]".
              </p>
            </div>
          )}

          {!jsonData.value && (
            <div class={styles.error} style={{ marginBottom: '1rem' }}>
              <span class="iconify" data-icon="carbon:warning"></span>
              <span>No valid array of objects found at this path.</span>
            </div>
          )}
        </>
      )}

      {/* CSV Section */}
      {!isJson.value && (
        <>
          <div class={styles.group}>
            <label class={styles.label}>Delimiter:</label>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {[
                { val: ',', label: 'Comma (,)' },
                { val: '\t', label: 'Tab' },
                { val: ';', label: 'Semicolon (;)' },
              ].map((opt) => (
                <label key={opt.val} class={styles.checkboxLabel} style={{ margin: 0 }}>
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

          <div class={styles.group}>
            <label class={styles.label}>Column Headers:</label>
            {[
              { val: 'first-row', label: 'First row contains headers (recommended)' },
              { val: 'auto-generate', label: 'Auto-generate headers (Column 1, Column 2, ...)' },
              { val: 'manual', label: 'Specify manually' },
            ].map((opt) => (
              <label key={opt.val} class={styles.checkboxLabel}>
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
        <div class={styles.group} style={{ maxHeight: '150px', overflowY: 'auto' }}>
          <label class={styles.label} style={{ fontSize: '13px', marginBottom: '8px' }}>
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
                class={styles.input}
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
        <div class={styles.warningBox}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div class={styles.warningTitle}>Duplicate Column Names Detected</div>
            <div class={styles.warningText} style={{ marginBottom: '0.5rem' }}>
              {duplicateWarning.value}
            </div>
            <div class={styles.warningText}>
              Duplicates have been automatically renamed by adding a suffix (e.g., "_2", "_3").
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
