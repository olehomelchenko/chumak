import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import {
  validateRegexpExtractExpression,
  debouncedUpdateRegexpExtractPreview,
} from '../handlers/transform/regexp-handlers';
import styles from './TransformDialog.module.css';

export function RegexpExtractDialog() {
  const { t } = useTranslation('dialogs');
  const { sourceColumn, pattern, columnName, group, error } = DialogStore.regexpExtractState;
  const columns = AppStore.columns.value;

  const handleInput = () => {
    validateRegexpExtractExpression();
    debouncedUpdateRegexpExtractPreview();
  };

  return (
    <div>
      <p class={styles.helpText} style={{ marginBottom: '1rem' }}>
        {t('regexpExtract.description')}
      </p>

      <div class={styles.group}>
        <ColumnSelector
          columns={columns}
          selectedColumns={sourceColumn.value}
          onSelectionChange={(col) => {
            sourceColumn.value = col as string;
            debouncedUpdateRegexpExtractPreview();
          }}
          mode="single"
          display="chip"
          label={t('regexpExtract.sourceColumnLabel')}
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>{t('regexpExtract.patternLabel')}</label>
        <input
          type="text"
          class={styles.input}
          value={pattern.value}
          onInput={(e) => {
            pattern.value = (e.target as HTMLInputElement).value;
            handleInput();
          }}
          placeholder={t('regexpExtract.patternPlaceholder')}
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>{t('regexpExtract.groupLabel')}</label>
        <input
          type="number"
          class={styles.input}
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

      <div class={styles.group}>
        <label class={styles.label}>{t('regexpExtract.columnNameLabel')}</label>
        <input
          type="text"
          class={styles.input}
          value={columnName.value}
          onInput={(e) => {
            columnName.value = (e.target as HTMLInputElement).value;
            debouncedUpdateRegexpExtractPreview();
          }}
          placeholder={t('regexpExtract.columnNamePlaceholder')}
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
          <span>{t('regexpExtract.help.title')}</span>
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
            <code class={styles.mono}>
              (\d{`{4}`})-(\d{`{2}`})-(\d{`{2}`})
            </code>{' '}
            {t('regexpExtract.help.dateParts')}
          </div>
          <div>
            <code class={styles.mono}>@(.+)$</code> {t('regexpExtract.help.emailDomain')}
          </div>
          <div>
            <code class={styles.mono}>(?i)(error|warning)</code>{' '}
            {t('regexpExtract.help.extractLevel')}
          </div>
          <div>
            <code class={styles.mono}>^([A-Z]{`{2}`})</code> {t('regexpExtract.help.firstLetters')}
          </div>
        </div>
      </div>
    </div>
  );
}
