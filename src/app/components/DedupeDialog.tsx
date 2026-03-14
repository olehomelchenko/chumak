import { useTranslation } from 'preact-i18next';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';
import { ColumnSelector } from './column-selector';
import { InlineBanner } from './InlineBanner';
import { toggleDedupeAllColumns, updateDedupePreview } from '../handlers/transform/dedupe-handlers';
import styles from './form-controls.module.css';

export function DedupeDialog() {
  const { t } = useTranslation('dialogs');
  const { mode, useAllColumns, selectedColumns, duplicateCount } = DialogStore.dedupeState;
  const columns = AppStore.columns.value;

  const handleModeChange = (newMode: 'remove' | 'keep') => {
    mode.value = newMode;
    updateDedupePreview();
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
    updateDedupePreview();
  };

  return (
    <div>
      {/* Mode Toggle */}
      <div class={styles.group} style={{ marginBottom: '1rem' }}>
        <label class={styles.label} style={{ marginBottom: '0.5rem' }}>
          {t('dedupe.action.label')}
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            class={`button button--small ${
              mode.value === 'remove' ? 'button--primary' : 'button--secondary'
            }`}
            onClick={() => handleModeChange('remove')}
          >
            {t('dedupe.action.remove')}
          </button>
          <button
            type="button"
            class={`button button--small ${
              mode.value === 'keep' ? 'button--primary' : 'button--secondary'
            }`}
            onClick={() => handleModeChange('keep')}
          >
            {t('dedupe.action.keep')}
          </button>
        </div>
      </div>

      {/* Column Scope Toggle */}
      <div class={styles.group}>
        <label class={styles.label} style={{ marginBottom: '0.5rem' }}>
          {t('dedupe.compareBy.label')}
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            class={`button button--small ${
              useAllColumns.value ? 'button--primary' : 'button--secondary'
            }`}
            onClick={() => toggleDedupeAllColumns(true)}
          >
            {t('dedupe.compareBy.allColumns')}
          </button>
          <button
            type="button"
            class={`button button--small ${
              !useAllColumns.value ? 'button--primary' : 'button--secondary'
            }`}
            onClick={() => toggleDedupeAllColumns(false)}
          >
            {t('dedupe.compareBy.specificColumns')}
          </button>
        </div>
      </div>

      {!useAllColumns.value && (
        <div class={styles.group}>
          <p class={styles.helpText} style={{ marginBottom: '0.75rem' }}>
            {t('dedupe.selectKeyHelp')}
          </p>

          <ColumnSelector
            columns={columns}
            selectedColumns={getSelectedColumnNames()}
            onSelectionChange={handleColumnSelectionChange}
            mode="multi"
            display="chip"
            allowSelectAll={true}
          />
        </div>
      )}

      {useAllColumns.value && (
        <div class={styles.helpText} style={{ margin: '0.75rem 0' }}>
          <span
            class="iconify"
            aria-hidden="true"
            data-icon="carbon:information"
            style={{ verticalAlign: 'middle' }}
          ></span>{' '}
          {t('dedupe.allColumnsInfo')}
        </div>
      )}

      <InlineBanner
        variant={duplicateCount.value > 0 ? 'warning' : 'success'}
        icon={duplicateCount.value > 0 ? 'carbon:warning' : 'carbon:checkmark-outline'}
      >
        {duplicateCount.value > 0 ? (
          <span>
            <strong>{duplicateCount.value.toLocaleString()}</strong>{' '}
            {t('dedupe.preview.found', { count: duplicateCount.value })}
          </span>
        ) : (
          <span>{t('dedupe.preview.none')}</span>
        )}
      </InlineBanner>

      <p
        class={styles.helpText}
        style={{
          marginTop: '0.75rem',
          fontSize: '0.75rem',
          display: mode.value === 'remove' ? 'block' : 'none',
        }}
      >
        {t('dedupe.help.remove')}
      </p>
      <p
        class={styles.helpText}
        style={{
          marginTop: '0.75rem',
          fontSize: '0.75rem',
          display: mode.value === 'keep' ? 'block' : 'none',
        }}
      >
        {t('dedupe.help.keep')}
      </p>
    </div>
  );
}
