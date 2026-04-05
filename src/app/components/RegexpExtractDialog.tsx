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

export function RegexpExtractDialog() {
  const { t } = useTranslation('dialogs');

  const { state } = useDialogState(
    (ctx) => {
      // For editing, derive values from the existing derive expression
      // regexpExtract is stored as: { derive: { colName: "regexp_extract(src, pat, group)" } }
      const editing = ctx.editingStep?.derive;
      let editSourceColumn = '';
      let editPattern = '';
      let editColumnName = '';
      let editGroup = 0;

      if (editing) {
        const [colName, expr] = Object.entries(editing)[0];
        editColumnName = colName;
        const match = (expr as string).match(
          /^regexp_extract\((\[?[^\],]+\]?),\s*"(.*)",\s*(\d+)\)$/
        );
        if (match) {
          editSourceColumn = match[1].replace(/^\[|\]$/g, '');
          editPattern = match[2].replace(/\\\\/g, '\\').replace(/\\"/g, '"');
          editGroup = parseInt(match[3], 10) || 0;
        }
      }

      const defaultColumn = editSourceColumn || ctx.selectedColumns[0] || ctx.columns[0] || '';

      return {
        sourceColumn: signal<string>(defaultColumn),
        pattern: signal<string>(editPattern),
        columnName: signal<string>(editColumnName),
        group: signal<number>(editGroup),
        error: signal<string | null>(null),
      };
    },
    {
      hasError: (s) => !!s.error.value || !s.columnName.value?.trim() || !s.pattern.value?.trim(),
      getError: (s) => s.error.value,
    }
  );

  const { sourceColumn, pattern, columnName, group, error } = state;
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
      const outputCol = columnName.value || 'extracted';
      const groupNum = group.value || 0;

      const rows = samples.map((row: any) => {
        const val = row[src];
        let extracted: string | null = null;
        if (val != null) {
          const match = String(val).match(regex);
          extracted = match ? (match[groupNum] ?? match[0]) : null;
        }
        return { [src]: val, [outputCol]: extracted ?? '(no match)' };
      });

      return {
        title: `Regexp Extract: ${outputCol}`,
        stats: `Extracting group ${groupNum} from ${samples.length} rows`,
        columns: [src, outputCol],
        newColumns: [outputCol],
        rows,
      };
    },
    deps: () => {
      sourceColumn.value;
      pattern.value;
      columnName.value;
      group.value;
      error.value;
    },
  });

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
            validatePattern();
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
