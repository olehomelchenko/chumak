import { useTranslation } from 'preact-i18next';
import {
  jsonPath,
  suggestedKeys,
  jsonRawValuePreview,
  selectPathSegment,
  resetPath,
} from '../state';
import styles from '../JsonToCsv.module.css';

export function PathSelector() {
  const { t } = useTranslation('tools');
  const keys = suggestedKeys.value;
  const preview = jsonRawValuePreview.value;

  if (keys.length === 0 && !jsonPath.value) return null;

  return (
    <div class={styles.sidebarSection}>
      <div class={styles.sidebarLabel}>{t('jsonToCsv.path.label')}</div>

      {jsonPath.value && (
        <div class={styles.pathDisplay}>
          <span class={styles.pathValue}>{jsonPath.value}</span>
          <button class={styles.pathReset} onClick={resetPath}>
            {t('jsonToCsv.path.reset')}
          </button>
        </div>
      )}

      {keys.length > 0 && (
        <>
          <div class={styles.pathHelp}>{t('jsonToCsv.path.help')}</div>
          <div class={styles.pathKeys}>
            {keys.map((keyInfo) => {
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
                  class={styles.pathKey}
                  style={isPrimitive ? { opacity: 0.45, cursor: 'default' } : undefined}
                  onClick={() => !isPrimitive && selectPathSegment(keyInfo.key)}
                  disabled={isPrimitive}
                >
                  {typeSymbol && (
                    <span style={{ marginRight: '3px', fontSize: '0.65rem' }}>{typeSymbol}</span>
                  )}
                  {keyInfo.key}
                </button>
              );
            })}
          </div>
        </>
      )}

      {preview && (
        <>
          <div class={styles.sidebarLabel} style={{ marginTop: '0.5rem' }}>
            {t('jsonToCsv.path.valueAtPath')}
          </div>
          <div class={styles.jsonView}>
            <pre class={styles.jsonViewContent}>{preview}</pre>
          </div>
        </>
      )}
    </div>
  );
}
