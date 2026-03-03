import { useComputed } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import styles from './TransformDialog.module.css';
import { ColumnSelector } from './column-selector';
import * as FoldHandlers from '../handlers/transform/fold-handlers';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import type { UnpivotMode } from '../../types/modes';

// Re-export for backward compatibility
export type { UnpivotMode } from '../../types/modes';

export function UnpivotDialog() {
  const { t } = useTranslation('dialogs');
  const { keyName, valueName, mode, selectedColumns } = DialogStore.foldState;
  const columns = AppStore.columns.value;
  const labelText = useComputed(() =>
    mode.value === 'keep' ? t('unpivot.selectKeep') : t('unpivot.selectFold')
  );

  const handleKeyNameInput = (e: any) => {
    keyName.value = e.currentTarget.value;
    FoldHandlers.updateFoldPreview();
  };

  const handleValueNameInput = (e: any) => {
    valueName.value = e.currentTarget.value;
    FoldHandlers.updateFoldPreview();
  };

  const handleModeChange = (newMode: UnpivotMode) => {
    mode.value = newMode;
    FoldHandlers.updateFoldPreview();
  };

  // Convert boolean array to string array for ColumnSelector
  const getSelectedColumnNames = (): string[] => {
    return columns.filter((_, index) => selectedColumns.value[index]);
  };

  // Convert string array from ColumnSelector to boolean array
  const handleColumnSelectionChange = (selected: string[] | string) => {
    const selectedArray = Array.isArray(selected) ? selected : [selected];
    const newSelection = columns.map((col) => selectedArray.includes(col));
    selectedColumns.value = newSelection;
    FoldHandlers.updateFoldPreview();
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
            onInput={handleKeyNameInput}
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
            onInput={handleValueNameInput}
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
            onClick={() => handleModeChange('keep')}
          >
            {t('unpivot.modes.keep')}
          </button>
          <button
            type="button"
            class={`${styles.toggleButton} ${mode.value === 'fold' ? styles.active : ''}`}
            onClick={() => handleModeChange('fold')}
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
      />
    </div>
  );
}
