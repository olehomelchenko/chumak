import { signal } from '@preact/signals';
import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { useDialogState } from '../hooks/useDialogState';
import { getColumnsForTarget } from '../handlers/transform/join-handlers';
import { previewAppend } from '../handlers/transform/append-handlers';
import formStyles from './form-controls.module.css';
import colStyles from './column-editor.module.css';
import prevStyles from './preview-table.module.css';
const styles = { ...formStyles, ...colStyles, ...prevStyles };
import joinStyles from './JoinDialog.module.css';
import tableStyles from './DataTable.module.css';
import { JoinTreeSelector } from './JoinTreeSelector';
import { TablePreviewModal } from './TablePreviewModal';

export function AppendDialog() {
  const { t } = useTranslation('dialogs');

  const { state } = useDialogState(
    (ctx) => {
      const models = AppStore.models.value;
      const sources = AppStore.sources.value;
      const activeModel = AppStore.activeModel.value;
      const activeSource = AppStore.activeSource.value;

      const leftModelId = activeModel?.id || activeSource?.id || null;
      const leftCols = leftModelId ? getColumnsForTarget(leftModelId) : [];

      // Check for editing
      const editConcat = ctx.editingStep?.concat;
      const editUnion = ctx.editingStep?.union;
      const editing = editConcat || editUnion;

      let initialTarget: string | null = null;
      let rightCols: string[] = [];
      let initialSelectedLeft = [...leftCols];
      let initialSelectedRight: string[] = [];
      let initialRemoveDuplicates = false;

      if (editing) {
        initialTarget = editing.with;
        rightCols = initialTarget ? getColumnsForTarget(initialTarget) : [];
        initialSelectedLeft = editing.columns || [...leftCols];
        initialSelectedRight = editing.targetColumns || [...rightCols];
        initialRemoveDuplicates = !!editUnion;
      } else {
        // First available model or source that is not the active one
        const firstModel = models.find((m) => (activeModel ? m.id !== activeModel.id : true));
        initialTarget = firstModel?.id || sources[0]?.id || null;
        rightCols = initialTarget ? getColumnsForTarget(initialTarget) : [];
        initialSelectedRight = [...rightCols];
      }

      return {
        leftModel: signal<string | null>(leftModelId),
        targetModel: signal<string | null>(initialTarget),
        leftColumns: signal<string[]>(leftCols),
        rightColumns: signal<string[]>(rightCols),
        selectedLeftColumns: signal<string[]>(initialSelectedLeft),
        selectedRightColumns: signal<string[]>(initialSelectedRight),
        removeDuplicates: signal(initialRemoveDuplicates),
        previewData: signal<any | null>(null),
        previewError: signal<string | null>(null),
        isPreviewing: signal(false),
        previewTableId: signal<string | null>(null),
      };
    },
    {
      hasError: (s) => !s.targetModel.value,
      getState: (s) => ({
        leftModel: s.leftModel.value,
        targetModel: s.targetModel.value,
        removeDuplicates: s.removeDuplicates.value,
        selectedLeftColumns: s.selectedLeftColumns.value,
        selectedRightColumns: s.selectedRightColumns.value,
      }),
    }
  );

  const {
    leftModel,
    targetModel,
    leftColumns,
    rightColumns,
    selectedLeftColumns,
    selectedRightColumns,
    removeDuplicates,
    previewData,
    previewError,
    isPreviewing,
    previewTableId,
  } = state;

  const activeModel = AppStore.activeModel.value;
  const activeSource = AppStore.activeSource.value;

  const handleLeftModelChange = (id: string) => {
    leftModel.value = id;
    const cols = getColumnsForTarget(id);
    leftColumns.value = cols;
    selectedLeftColumns.value = [...cols];
    previewData.value = null;
    previewError.value = null;
  };

  const handleRightModelChange = (id: string) => {
    targetModel.value = id;
    const cols = getColumnsForTarget(id);
    rightColumns.value = cols;
    selectedRightColumns.value = [...cols];
    previewData.value = null;
    previewError.value = null;
  };

  const handleToggleDuplicates = (e: Event) => {
    const target = e.target as HTMLInputElement;
    removeDuplicates.value = target.checked;
    previewData.value = null;
    previewError.value = null;
  };

  const toggleLeftColumn = (col: string) => {
    const selected = selectedLeftColumns.value;
    selectedLeftColumns.value = selected.includes(col)
      ? selected.filter((c) => c !== col)
      : [...selected, col];
  };

  const toggleRightColumn = (col: string) => {
    const selected = selectedRightColumns.value;
    selectedRightColumns.value = selected.includes(col)
      ? selected.filter((c) => c !== col)
      : [...selected, col];
  };

  const selectAllLeftColumns = () => {
    selectedLeftColumns.value = [...leftColumns.value];
  };

  const selectNoneLeftColumns = () => {
    selectedLeftColumns.value = [];
  };

  const selectAllRightColumns = () => {
    selectedRightColumns.value = [...rightColumns.value];
  };

  const selectNoneRightColumns = () => {
    selectedRightColumns.value = [];
  };

  const handlePreview = () => {
    previewAppend(state);
  };

  // Get current left model ID (from active model or source)
  const currentLeftId = activeModel?.id || activeSource?.id || null;
  const effectiveLeftId = leftModel.value || currentLeftId;

  return (
    <div class={joinStyles.joinDialog}>
      {/* Two-column layout for source/model selection */}
      <div class={joinStyles.sourceSelectorGrid}>
        {/* Left Side */}
        <div class={joinStyles.sourceSelector}>
          <label class={styles.label}>{t('append.leftTableLabel')}</label>
          <div class={joinStyles.currentSelection}>
            {effectiveLeftId && (
              <div class={joinStyles.currentSelectionItem}>
                {activeModel && effectiveLeftId === activeModel.id ? (
                  <>
                    <span class={joinStyles.icon}>{t('append.icon.model')}</span>
                    <span class={joinStyles.name}>{activeModel.name}</span>
                  </>
                ) : activeSource && effectiveLeftId === activeSource.id ? (
                  <>
                    <span class={joinStyles.icon}>{t('append.icon.source')}</span>
                    <span class={joinStyles.name}>{activeSource.name}</span>
                  </>
                ) : (
                  <span class={joinStyles.name}>{t('append.selected')}</span>
                )}
              </div>
            )}
          </div>
          <JoinTreeSelector
            selectedId={effectiveLeftId}
            onSelect={handleLeftModelChange}
            excludeId={targetModel.value}
            onPreview={(id) => {
              previewTableId.value = id;
            }}
          />
        </div>

        {/* Right Side */}
        <div class={joinStyles.sourceSelector}>
          <label class={styles.label}>{t('append.rightTableLabel')}</label>
          <JoinTreeSelector
            selectedId={targetModel.value}
            onSelect={handleRightModelChange}
            excludeId={effectiveLeftId}
            onPreview={(id) => {
              previewTableId.value = id;
            }}
          />
        </div>
      </div>

      {/* Mode Toggle */}
      <div class={styles.group}>
        <label class={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={removeDuplicates.value}
            onChange={handleToggleDuplicates}
          />
          {t('append.removeDuplicates')}
        </label>
        <div class={styles.helpText}>
          {removeDuplicates.value
            ? t('append.removeDuplicatesHelp.on')
            : t('append.removeDuplicatesHelp.off')}
        </div>
      </div>

      {/* Column Selection */}
      <div class={joinStyles.columnSelectionGrid}>
        {/* Left Columns */}
        <div class={styles.group}>
          <label class={styles.label}>{t('append.leftColumnsLabel')}</label>
          <div class={styles.actions} style={{ marginBottom: '0.5rem', marginTop: 0 }}>
            <button
              type="button"
              class="button button--text button--small"
              onClick={selectAllLeftColumns}
            >
              {t('append.selectAll')}
            </button>
            <button
              type="button"
              class="button button--text button--small"
              onClick={selectNoneLeftColumns}
            >
              {t('append.selectNone')}
            </button>
          </div>
          <div class={styles.columnEditorList}>
            {leftColumns.value.map((col) => {
              const isSelected = selectedLeftColumns.value.includes(col);
              return (
                <div
                  key={col}
                  class={`${styles.columnEditorItem} ${!isSelected ? styles.unselected : ''}`}
                >
                  <button
                    type="button"
                    class={styles.itemCheckbox}
                    onClick={() => toggleLeftColumn(col)}
                  >
                    <span
                      style={{
                        color: isSelected ? 'var(--color-green)' : 'var(--color-red)',
                      }}
                    >
                      {isSelected ? '✓' : '✗'}
                    </span>
                  </button>
                  <span
                    class={styles.originalName}
                    style={{
                      textDecoration: !isSelected ? 'line-through' : 'none',
                      opacity: !isSelected ? 0.6 : 1,
                    }}
                  >
                    {col}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Columns */}
        <div class={styles.group}>
          <label class={styles.label}>{t('append.rightColumnsLabel')}</label>
          <div class={styles.actions} style={{ marginBottom: '0.5rem', marginTop: 0 }}>
            <button
              type="button"
              class="button button--text button--small"
              onClick={selectAllRightColumns}
            >
              {t('append.selectAll')}
            </button>
            <button
              type="button"
              class="button button--text button--small"
              onClick={selectNoneRightColumns}
            >
              {t('append.selectNone')}
            </button>
          </div>
          <div class={styles.columnEditorList}>
            {rightColumns.value.map((col) => {
              const isSelected = selectedRightColumns.value.includes(col);
              return (
                <div
                  key={col}
                  class={`${styles.columnEditorItem} ${!isSelected ? styles.unselected : ''}`}
                >
                  <button
                    type="button"
                    class={styles.itemCheckbox}
                    onClick={() => toggleRightColumn(col)}
                  >
                    <span
                      style={{
                        color: isSelected ? 'var(--color-green)' : 'var(--color-red)',
                      }}
                    >
                      {isSelected ? '✓' : '✗'}
                    </span>
                  </button>
                  <span
                    class={styles.originalName}
                    style={{
                      textDecoration: !isSelected ? 'line-through' : 'none',
                      opacity: !isSelected ? 0.6 : 1,
                    }}
                  >
                    {col}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview Button */}
      <div class={styles.group}>
        <button
          class="button button--secondary"
          onClick={handlePreview}
          disabled={isPreviewing.value || !targetModel.value}
        >
          {isPreviewing.value ? t('append.previewing') : t('append.previewButton')}
        </button>
      </div>

      {/* Preview Error */}
      {previewError.value && <div class={styles.error}>{previewError.value}</div>}

      {/* Preview Results */}
      {previewData.value && (
        <div class={styles.group}>
          <div class={styles.previewContainer}>
            <strong>{t('append.previewTitle')}</strong>
            <div>
              {t('append.previewCount', {
                rowCount: previewData.value.totalRows || 0,
                columnCount: previewData.value.columns?.length || 0,
              })}
            </div>
          </div>

          <div class={styles.previewScroll}>
            <div class={tableStyles.tableContainer}>
              <table class={tableStyles.dataTable}>
                <thead>
                  <tr>
                    {previewData.value.columns?.map((col: string) => (
                      <th key={col} class={tableStyles.dataTable__header}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.value.rows?.map((row: any, idx: number) => (
                    <tr key={idx} class={tableStyles.dataTable__row}>
                      {previewData.value.columns?.map((col: string) => (
                        <td key={col} class={tableStyles.cell}>
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Table Preview Modal */}
      <TablePreviewModal previewTableId={previewTableId} previewMismatchValues={signal(null)} />
    </div>
  );
}
