import { signal, useComputed } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import styles from './form-controls.module.css';
import { ColumnSelector } from './column-selector';
import { AppStore } from '../stores/AppStore';
import { useDialogState } from '../hooks/useDialogState';
import { useTransformPreview } from '../hooks/useTransformPreview';
import { computeColumnsToFold, computeFoldPreview } from '../handlers/transform/fold-handlers';
import type { UnpivotMode } from '../../types/modes';

export function UnpivotDialog() {
  const { t } = useTranslation('dialogs');
  const columns = AppStore.columns.value;

  const { state } = useDialogState(
    (ctx) => {
      const editing = ctx.editingStep?.fold;
      return {
        keyName: signal(editing ? editing.as[0] : 'key'),
        valueName: signal(editing ? editing.as[1] : 'value'),
        selectedColumns: signal<boolean[]>(
          editing
            ? ctx.columns.map((c) => editing.columns.includes(c))
            : ctx.selectedColumns.length > 0
              ? ctx.columns.map((col) => ctx.selectedColumns.includes(col))
              : ctx.columns.map(() => false)
        ),
        mode: signal<UnpivotMode>(editing ? 'fold' : 'keep'),
      };
    },
    {
      hasError: (s) =>
        computeColumnsToFold(AppStore.columns.value, s.selectedColumns.value, s.mode.value)
          .length === 0,
    }
  );

  const { keyName, valueName, mode, selectedColumns } = state;

  const labelText = useComputed(() =>
    mode.value === 'keep' ? t('unpivot.selectKeep') : t('unpivot.selectFold')
  );

  useTransformPreview({
    deps: () => {
      keyName.value;
      valueName.value;
      selectedColumns.value;
      mode.value;
    },
    compute: () =>
      computeFoldPreview(
        columns,
        selectedColumns.value,
        mode.value,
        keyName.value,
        valueName.value
      ),
  });

  // Convert boolean array to string array for ColumnSelector
  const getSelectedColumnNames = (): string[] => {
    return columns.filter((_, index) => selectedColumns.value[index]);
  };

  // Convert string array from ColumnSelector to boolean array
  const handleColumnSelectionChange = (selected: string[] | string) => {
    const selectedArray = Array.isArray(selected) ? selected : [selected];
    selectedColumns.value = columns.map((col) => selectedArray.includes(col));
  };

  return (
    <div>
      <p class={styles.helpText} style={{ marginBottom: '1rem' }}>
        {t('unpivot.description')}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div class={styles.group}>
          <label class={styles.label}>{t('unpivot.keyNameLabel')}</label>
          <input
            type="text"
            class={styles.input}
            value={keyName.value}
            onInput={(e) => (keyName.value = (e.currentTarget as HTMLInputElement).value)}
            placeholder={t('unpivot.keyNamePlaceholder')}
          />
          <p class={styles.helpText} style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {t('unpivot.keyNameHelp')}
          </p>
        </div>

        <div class={styles.group}>
          <label class={styles.label}>{t('unpivot.valueNameLabel')}</label>
          <input
            type="text"
            class={styles.input}
            value={valueName.value}
            onInput={(e) => (valueName.value = (e.currentTarget as HTMLInputElement).value)}
            placeholder={t('unpivot.valueNamePlaceholder')}
          />
          <p class={styles.helpText} style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {t('unpivot.valueNameHelp')}
          </p>
        </div>
      </div>

      <div class={styles.group} style={{ marginBottom: '0.75rem' }}>
        <label class={styles.label}>{t('unpivot.modeLabel')}</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            class={`${styles.toggleButton} ${mode.value === 'keep' ? styles.active : ''}`}
            onClick={() => (mode.value = 'keep')}
          >
            {t('unpivot.modes.keep')}
          </button>
          <button
            type="button"
            class={`${styles.toggleButton} ${mode.value === 'fold' ? styles.active : ''}`}
            onClick={() => (mode.value = 'fold')}
          >
            {t('unpivot.modes.fold')}
          </button>
        </div>
        <p class={styles.helpText} style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
          {mode.value === 'keep' ? (
            <span>{t('unpivot.modeHelp.keep')}</span>
          ) : (
            <span>{t('unpivot.modeHelp.fold')}</span>
          )}
        </p>
      </div>

      <ColumnSelector
        columns={columns}
        selectedColumns={getSelectedColumnNames()}
        onSelectionChange={handleColumnSelectionChange}
        mode="multi"
        display="chip"
        allowSelectAll={true}
        label={labelText.value}
        searchable
      />
    </div>
  );
}
