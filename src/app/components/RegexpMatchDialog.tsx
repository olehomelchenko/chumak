import { signal } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { useDialogState } from '../hooks/useDialogState';
import { useTransformPreview } from '../hooks/useTransformPreview';
import { validateRegexPattern } from '../handlers/validation-engine';
import { ColumnSelector } from './column-selector';
import formStyles from './form-controls.module.css';
import exprStyles from './expression-help.module.css';
const styles = { ...formStyles, ...exprStyles };

export function RegexpMatchDialog() {
  const { t } = useTranslation('dialogs');

  const { state } = useDialogState(
    (ctx) => {
      // For editing, derive values from the existing derive expression
      // regexpMatch is stored as a derive step: { derive: { colName: "regexp_match(src, pat)" } }
      const editing = ctx.editingStep?.derive;
      let editSourceColumn = '';
      let editPattern = '';
      let editColumnName = '';

      if (editing) {
        const [colName, expr] = Object.entries(editing)[0];
        editColumnName = colName;
        const match = (expr as string).match(/^regexp_match\((\[?[^\],]+\]?),\s*"(.*)"\)$/);
        if (match) {
          editSourceColumn = match[1].replace(/^\[|\]$/g, '');
          editPattern = match[2].replace(/\\\\/g, '\\').replace(/\\"/g, '"');
        }
      }

      const defaultColumn = editSourceColumn || ctx.selectedColumns[0] || ctx.columns[0] || '';

      return {
        sourceColumn: signal<string>(defaultColumn),
        pattern: signal<string>(editPattern),
        columnName: signal<string>(editColumnName),
        error: signal<string | null>(null),
      };
    },
    {
      hasError: (s) => !!s.error.value || !s.columnName.value?.trim() || !s.pattern.value?.trim(),
      getError: (s) => s.error.value,
    }
  );

  const { sourceColumn, pattern, columnName, error } = state;
  const columns = AppStore.columns.value;

  const validatePattern = () => {
    validateRegexPattern(pattern.value, { errorSignal: error });
  };

  useTransformPreview({
    compute: () => {
      const src = sourceColumn.value;
      const pat = pattern.value;
      const currentData = AppStore.currentData.value;
      if (!src || !pat || error.value || !currentData?.length) return null;

      const regex = new RegExp(pat);
      const previewLimit = Math.min(AppStore.uxSettings.value.preview.rowLimit, 50);
      const samples = currentData.slice(0, previewLimit);
      const outputCol = columnName.value || 'is_match';

      const rows = samples.map((row: any) => {
        const val = row[src];
        const matches = val != null ? regex.test(String(val)) : false;
        return { [src]: val, [outputCol]: matches };
      });

      return {
        title: `Regexp Match: ${outputCol}`,
        stats: `Testing pattern on ${samples.length} rows`,
        columns: [src, outputCol],
        newColumns: [outputCol],
        rows,
      };
    },
    deps: () => {
      sourceColumn.value;
      pattern.value;
      columnName.value;
      error.value;
    },
  });

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
            validatePattern();
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
