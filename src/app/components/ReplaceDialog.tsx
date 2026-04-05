import { signal } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { useDialogState } from '../hooks/useDialogState';
import { ColumnSelector } from './column-selector';
import styles from './form-controls.module.css';

export type ReplaceFindMode = 'value' | 'errors' | 'null';

export function ReplaceDialog() {
  const { t } = useTranslation('dialogs');

  const { state } = useDialogState(
    (ctx) => {
      const editing = ctx.editingStep?.replace;
      if (editing) {
        return {
          column: signal<string>(editing.column),
          findMode: signal<ReplaceFindMode>(editing.matchMode ?? 'value'),
          findValue: signal<string>(editing.find ?? ''),
          replaceValue: signal<string>(editing.replace ?? ''),
          isRegex: signal<boolean>(editing.isRegex ?? false),
        };
      }

      // Quick-replace from cell: read selectedCell for pre-fill
      const selectedCell = AppStore.selectedCell.value;
      const selectedColumn = AppStore.selectedColumn.value;
      const defaultColumn = selectedCell?.col || selectedColumn || ctx.columns[0] || '';

      let findMode: ReplaceFindMode = 'value';
      let findValue = '';
      if (selectedCell) {
        if (selectedCell.isError) {
          findMode = 'errors';
        } else if (selectedCell.value === null || selectedCell.value === undefined) {
          findMode = 'null';
        } else {
          findValue = selectedCell.value;
        }
      }

      return {
        column: signal<string>(defaultColumn),
        findMode: signal<ReplaceFindMode>(findMode),
        findValue: signal<string>(findValue),
        replaceValue: signal<string>(''),
        isRegex: signal<boolean>(false),
      };
    },
    {
      hasError: (s) => !s.column.value,
    }
  );

  const { column, findMode, findValue, replaceValue, isRegex } = state;
  const columns = AppStore.columns.value;
  const mode = findMode.value;

  return (
    <div>
      <div class={styles.group}>
        <ColumnSelector
          columns={columns}
          selectedColumns={column.value}
          onSelectionChange={(col) => (column.value = col as string)}
          mode="single"
          display="chip"
          label={t('replace.columnLabel')}
        />
      </div>

      <div class={styles.group}>
        <label class={styles.label}>{t('replace.findLabel')}</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['value', 'errors', 'null'] as ReplaceFindMode[]).map((m) => (
            <button
              key={m}
              type="button"
              class={`${styles.toggleButton} ${mode === m ? styles.active : ''}`}
              onClick={() => (findMode.value = m)}
            >
              {t(`replace.findModes.${m}`)}
            </button>
          ))}
        </div>
      </div>

      {mode === 'value' && (
        <div class={styles.group}>
          <label class={styles.label}>
            {isRegex.value ? t('replace.findPattern') : t('replace.findValue')}
          </label>
          <input
            type="text"
            class={styles.input}
            value={findValue.value}
            onInput={(e) => (findValue.value = (e.target as HTMLInputElement).value)}
            placeholder={
              isRegex.value ? t('replace.patternPlaceholder') : t('replace.valuePlaceholder')
            }
          />
          <div style={{ marginTop: '8px' }}>
            <label class={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isRegex.value}
                onChange={(e) => (isRegex.value = (e.target as HTMLInputElement).checked)}
              />
              <span style={{ fontSize: '13px' }}>{t('replace.useRegex')}</span>
            </label>
          </div>
          <p class={styles.helpText}>
            {isRegex.value ? t('replace.regexHelp') : t('replace.valueHelp')}
          </p>
        </div>
      )}

      {mode === 'errors' && <p class={styles.helpText}>{t('replace.errorHelp')}</p>}

      {mode === 'null' && <p class={styles.helpText}>{t('replace.nullHelp')}</p>}

      <div class={styles.group}>
        <label class={styles.label}>{t('replace.replaceWith')}</label>
        <input
          type="text"
          class={styles.input}
          value={replaceValue.value}
          onInput={(e) => (replaceValue.value = (e.target as HTMLInputElement).value)}
          placeholder={
            mode === 'value' && isRegex.value
              ? t('replace.replacementPlaceholderRegex')
              : t('replace.replacementPlaceholder')
          }
        />
        <p class={styles.helpText}>
          {mode === 'value' && isRegex.value
            ? t('replace.replacementHelpRegex')
            : t('replace.replacementHelp')}
        </p>
      </div>

      {mode === 'value' && isRegex.value && (
        <p class={styles.helpText}>{t('replace.numericTip')}</p>
      )}
    </div>
  );
}
