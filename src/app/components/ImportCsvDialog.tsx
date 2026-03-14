import { JSX } from 'preact';
import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import { SchemaDiffPanel } from './SchemaDiffPanel';
import { InlineBanner } from './InlineBanner';
import formStyles from './form-controls.module.css';
import importStyles from './ImportCsvDialog.module.css';
const styles = { ...formStyles, ...importStyles };

// Props interface kept for reference/testing
export interface ImportCsvDialogProps {
  onJsonPathUpdate?: (path: string) => void;
  onJsonPathReset?: () => void;
  onJsonPathSegmentSelect?: (key: string) => void;
  onParamChange?: () => void;
  onBackToUrl?: () => void;
  onBackToText?: () => void;
  onSheetChange?: (index: number) => void;
}

export function ImportCsvDialog({
  onJsonPathUpdate,
  onJsonPathReset,
  onJsonPathSegmentSelect,
  onParamChange,
  onBackToUrl,
  onBackToText,
  onSheetChange,
}: ImportCsvDialogProps = {}) {
  const { t } = useTranslation(['dialogs', 'common']);
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
    isExcel,
    sheetNames,
    selectedSheetIndex,
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
          <span
            class="iconify"
            aria-hidden="true"
            data-icon="carbon:arrow-left"
            style={{ fontSize: '14px' }}
          ></span>
          {t('buttons.backToDatasets', { ns: 'common' })}
        </button>
      )}
      {fromTextEntry.value && onBackToText && (
        <button class={styles.backLink} onClick={onBackToText}>
          <span
            class="iconify"
            aria-hidden="true"
            data-icon="carbon:arrow-left"
            style={{ fontSize: '14px' }}
          ></span>
          {t('buttons.backToTextEntry', { ns: 'common' })}
        </button>
      )}

      {/* Replace Mode Banner */}
      {isReplaceMode.value && (
        <InlineBanner variant="info" icon="carbon:cyclostat" title={t('importCsv.replaceMode')}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-dark-gray)' }}>
            {t('importCsv.replacingSource')} <em>{sourceName.value}</em>
          </p>
        </InlineBanner>
      )}

      {/* Schema Diff Panel */}
      {isReplaceMode.value && schemaDiff.value && <SchemaDiffPanel diff={schemaDiff.value} />}

      {/* Source Name */}
      <div class={styles.group}>
        <label class={styles.label}>{t('importCsv.sourceNameLabel')}</label>
        <input
          type="text"
          class={styles.input}
          value={sourceName.value}
          onInput={(e) => (sourceName.value = e.currentTarget.value)}
          placeholder={t('importCsv.sourceNamePlaceholder')}
        />
        <p class={styles.helpText}>{t('importCsv.sourceNameHelp')}</p>
      </div>

      {/* JSON Section */}
      {isJson.value && (
        <>
          <div class={styles.group}>
            <label class={styles.label}>{t('importCsv.dataPathLabel')}</label>
            <input
              type="text"
              class={styles.input}
              value={jsonPath.value || ''}
              onInput={handleJsonPathInput}
              placeholder={t('importCsv.dataPathPlaceholder')}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              <button
                class="button button--secondary"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={handleJsonPathReset}
                disabled={!jsonPath.value}
              >
                {t('importCsv.reset')}
              </button>
              {suggestedJsonKeys.value.map((keyInfo) => {
                const isPrimitive = keyInfo.type === 'primitive';
                const typeSymbol =
                  keyInfo.type === 'object'
                    ? `{${keyInfo.count ?? ''}}`
                    : keyInfo.type === 'array'
                      ? `[${keyInfo.count ?? ''}]`
                      : '';
                return (
                  <button
                    key={keyInfo.key}
                    class="button button--secondary"
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderStyle: 'dashed',
                      ...(isPrimitive ? { opacity: 0.45, cursor: 'default' } : {}),
                    }}
                    onClick={() => !isPrimitive && handleJsonPathSegmentSelect(keyInfo.key)}
                    disabled={isPrimitive}
                  >
                    {typeSymbol && (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          marginRight: '3px',
                          fontSize: '10px',
                        }}
                      >
                        {typeSymbol}
                      </span>
                    )}
                    {keyInfo.key}
                  </button>
                );
              })}
            </div>
            <p class={styles.helpText} style={{ marginTop: '8px' }}>
              {t('importCsv.dataPathHelp')}
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
              <strong>{t('importCsv.examples')}</strong>
              <br />• <code>results</code> ({t('importCsv.exampleIfJsonIs')}{' '}
              <code>{`{ "results": [...] }`}</code>)
              <br />• <code>data.items</code> ({t('importCsv.exampleIfJsonIs')}{' '}
              <code>{`{ "data": { "items": [...] } }`}</code>)
              <br />• <code>0.data</code> ({t('importCsv.exampleArrayFirst')})
            </div>
          </div>

          {jsonRawValuePreview.value && (
            <div class={styles.group}>
              <label class={styles.label}>{t('importCsv.valueAtPath')}</label>
              <div class={styles.jsonView}>
                <pre class={styles.jsonViewContent}>{jsonRawValuePreview.value}</pre>
              </div>
            </div>
          )}

          {jsonRawValuePreview.value && (
            <div class={styles.group}>
              <label class={styles.label} style={{ marginBottom: '8px' }}>
                {t('importCsv.jsonOptions')}
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
                  <span>{t('importCsv.flattenNested')}</span>
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
                  <span>{t('importCsv.serializeNested')}</span>
                </label>
              </div>
              <p class={styles.helpText} style={{ marginTop: '4px' }}>
                {t('importCsv.serializeHelp')}
              </p>
            </div>
          )}

          {!jsonData.value && (
            <InlineBanner variant="error" icon="carbon:warning">
              {t('importCsv.noValidArray')}
            </InlineBanner>
          )}
        </>
      )}

      {/* Sheet Selector (multi-sheet Excel only) */}
      {isExcel.value && sheetNames.value.length > 1 && (
        <div class={styles.group}>
          <label class={styles.label}>{t('importCsv.sheetLabel')}</label>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {sheetNames.value.map((name, i) => (
              <label key={i} class={styles.checkboxLabel} style={{ margin: 0 }}>
                <input
                  type="radio"
                  name="sheetIndex"
                  value={i}
                  checked={selectedSheetIndex.value === i}
                  onChange={() => {
                    if (onSheetChange) {
                      onSheetChange(i);
                    }
                  }}
                />
                <span>{name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* CSV / Excel Section */}
      {!isJson.value && (
        <>
          {!isExcel.value && (
            <div class={styles.group}>
              <label class={styles.label}>{t('importCsv.delimiterLabel')}</label>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {[
                  { val: ',', label: t('importCsv.delimiterComma') },
                  { val: '\t', label: t('importCsv.delimiterTab') },
                  { val: ';', label: t('importCsv.delimiterSemicolon') },
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
          )}

          <div class={styles.group}>
            <label class={styles.label}>{t('importCsv.columnHeadersLabel')}</label>
            {[
              { val: 'first-row', label: t('importCsv.headerFirstRow') },
              { val: 'auto-generate', label: t('importCsv.headerAutoGenerate') },
              { val: 'manual', label: t('importCsv.headerManual') },
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
            {t('importCsv.specifyColumnNames')}
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
                placeholder={t('importCsv.columnPlaceholder', { index: index + 1 })}
                style={{ fontSize: '13px', padding: '6px 8px' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Auto-generate message */}
      {headerMode.value === 'auto-generate' && !isJson.value && (
        <div style={{ color: 'var(--color-dark-gray)', fontSize: '14px', padding: '8px 0' }}>
          {t('importCsv.autoGenerateMessage')}
        </div>
      )}

      {/* Duplicate Warning */}
      {duplicateWarning.value && (
        <InlineBanner variant="warning" icon="carbon:warning" title={t('importCsv.duplicateTitle')}>
          <div style={{ fontSize: '13px', marginBottom: '0.5rem' }}>{duplicateWarning.value}</div>
          <div style={{ fontSize: '13px' }}>{t('importCsv.duplicateHelp')}</div>
        </InlineBanner>
      )}
    </div>
  );
}
