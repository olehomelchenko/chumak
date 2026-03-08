import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import {
  validateRegexpMatchExpression,
  debouncedUpdateRegexpMatchPreview,
} from '../handlers/transform/regexp-handlers';
import formStyles from './form-controls.module.css';
import exprStyles from './expression-help.module.css';
const styles = { ...formStyles, ...exprStyles };

export function RegexpMatchDialog() {
  const { t } = useTranslation('dialogs');
  const { sourceColumn, pattern, columnName, error } = DialogStore.regexpMatchState;
  const columns = AppStore.columns.value;

  const handleInput = () => {
    validateRegexpMatchExpression();
    debouncedUpdateRegexpMatchPreview();
  };

  return (
    <div>
      <p class={styles.helpText} style={{ marginBottom: '1rem' }}>
        {t('regexpMatch.description')}
      </p>

      <div class={styles.group}>
        <ColumnSelector
          columns={columns}
          selectedColumns={sourceColumn.value}
          onSelectionChange={(col) => {
            sourceColumn.value = col as string;
            debouncedUpdateRegexpMatchPreview();
          }}
          mode="single"
          display="chip"
          label={t('regexpMatch.sourceColumnLabel')}
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>{t('regexpMatch.patternLabel')}</label>
        <input
          type="text"
          class={styles.input}
          value={pattern.value}
          onInput={(e) => {
            pattern.value = (e.target as HTMLInputElement).value;
            handleInput();
          }}
          placeholder={t('regexpMatch.patternPlaceholder')}
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>{t('regexpMatch.columnNameLabel')}</label>
        <input
          type="text"
          class={styles.input}
          value={columnName.value}
          onInput={(e) => {
            columnName.value = (e.target as HTMLInputElement).value;
            debouncedUpdateRegexpMatchPreview();
          }}
          placeholder={t('regexpMatch.columnNamePlaceholder')}
        />
      </div>

      {/* Error message */}
      {error.value && (
        <div class={styles.error} style={{ margin: '8px 0', fontFamily: 'var(--font-mono)' }}>
          {error.value}
        </div>
      )}

      {/* Help section */}
      <div class={styles.expressionHelp} style={{ borderStyle: 'solid' }}>
        <div class={styles.helpHeader}>
          <span>{t('regexpMatch.help.title')}</span>
          <button
            type="button"
            class="button button--text button--small"
            onClick={() => (AppStore.activeDialog.value = 'expressions')}
          >
            {t('common.buttons.fullReference')}
          </button>
        </div>
        <div class={styles.codeList}>
          <div>
            <code class={styles.mono}>^[A-Z]{`{2}`}</code> {t('regexpMatch.help.upperLetters')}
          </div>
          <div>
            <code class={styles.mono}>
              \d{`{3}`}-\d{`{4}`}
            </code>{' '}
            {t('regexpMatch.help.phoneFormat')}
          </div>
          <div>
            <code class={styles.mono}>(?i)error</code> {t('regexpMatch.help.caseInsensitive')}
          </div>
          <div>
            <code class={styles.mono}>@.+\.com$</code> {t('regexpMatch.help.emailDomain')}
          </div>
        </div>
      </div>
    </div>
  );
}
