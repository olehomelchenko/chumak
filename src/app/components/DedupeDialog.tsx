import { signal } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { useDialogState } from '../hooks/useDialogState';
import { useTransformPreview } from '../hooks/useTransformPreview';
import { findDuplicateRows, findAllDuplicateRowCount } from '../handlers/transform/dedupe-handlers';
import { ColumnSelector } from './column-selector';
import { InlineBanner } from './InlineBanner';
import type { DedupeMode } from '../../types/modes';
import styles from './form-controls.module.css';

export function DedupeDialog() {
  const { t } = useTranslation('dialogs');
  const columns = AppStore.columns.value;

  const { state } = useDialogState(
    (ctx) => {
      const editing = ctx.editingStep?.dedupe;
      const quickColumn = AppStore.selectedColumn.value;

      let selectedColumns: boolean[];
      let useAllColumns: boolean;
      let mode: DedupeMode = 'remove';

      if (editing) {
        const dedupeColumns = (editing as any).columns || [];
        useAllColumns = dedupeColumns.length === 0;
        selectedColumns = ctx.columns.map((c) => dedupeColumns.includes(c));
        mode = (editing as any).mode || 'remove';
      } else if (quickColumn) {
        useAllColumns = false;
        selectedColumns = ctx.columns.map((c) => c === quickColumn);
      } else {
        useAllColumns = true;
        selectedColumns = ctx.columns.map(() => true);
      }

      return {
        selectedColumns: signal<boolean[]>(selectedColumns),
        useAllColumns: signal(useAllColumns),
        duplicateCount: signal(0),
        mode: signal<DedupeMode>(mode),
      };
    },
    {
      hasError: (s) => !s.useAllColumns.value && !s.selectedColumns.value.some((v) => v),
      getState: (s) => ({
        selectedColumns: s.selectedColumns.value,
        useAllColumns: s.useAllColumns.value,
        mode: s.mode.value,
      }),
    }
  );

  const { selectedColumns, useAllColumns, duplicateCount, mode } = state;

  // Compute selected column names for the dedupe transform
  const getDedupeColumns = (): string[] => {
    if (useAllColumns.value) return [];
    return columns.filter((_, i) => selectedColumns.value[i]);
  };

  useTransformPreview({
    deps: () => {
      selectedColumns.value;
      useAllColumns.value;
      mode.value;
    },
    compute: () => {
      const currentData = AppStore.currentData.value;
      if (!currentData || currentData.length === 0) {
        duplicateCount.value = 0;
        return null;
      }

      const cols = getDedupeColumns();
      const duplicates = findDuplicateRows(currentData, cols);
      duplicateCount.value = duplicates.size;

      const colInfo =
        cols.length === 0
          ? 'all columns'
          : cols.length === 1
            ? `"${cols[0]}"`
            : `${cols.length} columns`;

      const duplicateIndices = Array.from(duplicates).slice(0, 5);
      const previewRows = duplicateIndices.map((i) => currentData[i]);

      let statsText: string;
      if (duplicates.size === 0) {
        statsText = `No duplicates found by ${colInfo}`;
      } else if (mode.value === 'keep') {
        const totalDuplicateRows = findAllDuplicateRowCount(currentData, cols);
        statsText = `${totalDuplicateRows} row${totalDuplicateRows !== 1 ? 's' : ''} are duplicates (will keep)`;
      } else {
        statsText = `${duplicates.size} duplicate row${duplicates.size !== 1 ? 's' : ''} will be removed`;
      }

      return {
        title: mode.value === 'keep' ? 'Keep Duplicates Preview' : 'Remove Duplicates Preview',
        stats: statsText,
        columns: cols.length > 0 ? cols : AppStore.columns.value.slice(0, 5),
        newColumns: [],
        rows: previewRows,
      };
    },
  });

  const handleModeChange = (newMode: DedupeMode) => {
    mode.value = newMode;
  };

  const getSelectedColumnNames = (): string[] => {
    return columns.filter((_, index) => selectedColumns.value[index]);
  };

  const handleColumnSelectionChange = (selected: string[] | string) => {
    const selectedArray = Array.isArray(selected) ? selected : [selected];
    const newSelection = columns.map((col) => selectedArray.includes(col));
    selectedColumns.value = newSelection;
  };

  const toggleAllColumns = (useAll: boolean) => {
    useAllColumns.value = useAll;
    if (useAll) {
      selectedColumns.value = columns.map(() => true);
    }
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
            onClick={() => toggleAllColumns(true)}
          >
            {t('dedupe.compareBy.allColumns')}
          </button>
          <button
            type="button"
            class={`button button--small ${
              !useAllColumns.value ? 'button--primary' : 'button--secondary'
            }`}
            onClick={() => toggleAllColumns(false)}
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
