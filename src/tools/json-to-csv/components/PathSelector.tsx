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
            {keys.map((key) => (
              <button key={key} class={styles.pathKey} onClick={() => selectPathSegment(key)}>
                {key}
              </button>
            ))}
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
