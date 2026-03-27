import { useComputed } from '@preact/signals';
import i18n from '../../i18n/core';
import { AppStore } from '../stores/AppStore';
import { isConversionError } from '../../core/type-converter';
import { DialogStore } from '../stores/DialogStore';
import { AppHeader } from './AppHeader';
import { RibbonToolbar } from './RibbonToolbar';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { EdaPanel } from './EdaPanel';
import { ColumnToolbar } from './ColumnToolbar';
import { CellToolbar } from './CellToolbar';
import { RowToolbar } from './RowToolbar';
import { GlobalUI } from './GlobalUI';
import { TypeMenu } from './TypeMenu';
import { isSlidePanel, isCenteredModal } from '../dialog-registry';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  SortDialog,
  IndexDialog,
  ReplaceDialog,
  SliceRowsDialog,
  SampleDialog,
  SpreadDialog,
  UnrollDialog,
  UnpivotDialog,
  FilterDialog,
  PivotDialog,
  DateDialog,
  ParseDateDialog,
  TextDialog,
  SplitDialog,
  MergeDialog,
  DeriveDialog,
  JoinDialog,
  AppendDialog,
  AggregateDialog,
  WindowDialog,
  ImportCsvDialog,
  ImportUrlDialog,
  ImportTextDialog,
  GenerateDialog,
  DownloadDialog,
  SettingsDialog,
  ColumnEditorDialog,
  RegexpMatchDialog,
  RegexpExtractDialog,
  DedupeDialog,
  TypeConversionDialog,
  ImputeDialog,
  ConditionalDialog,
  DependencyGraphDialog,
  FunctionReferenceDialog,
  DependencyImpactDialog,
  WorkflowImportDialog,
  PromoteHeaderDialog,
  SelectPatternDialog,
  RemovePatternDialog,
  RenamePatternDialog,
  DescribeDialog,
} from './index';
import { JsonEditorModal } from './JsonEditorModal';
// Import pure helper functions (no 'this' context needed)
import {
  hasPreviewData,
  getPreviewTitle,
  getPreviewStats,
  getPreviewColumns,
  getPreviewRows,
  isNewPreviewColumn,
  activeDialogHasError,
  getActiveDialogError,
} from '../orchestration/DialogCoordinator';
import {
  openDialog,
  closeDialog,
  getDialogTitle,
  getDialogButtonText,
} from '../handlers/dialog/dialog-handlers';
import {
  getModelMeta,
  getTypeIcon,
  getColumnType,
  formatCellValue,
  formatCellValueForTooltip,
} from '../handlers/core/helper-handlers';
import {
  viewStep,
  editStep,
  removeStep,
  viewFinalResult,
  undo,
  redo,
  applyActiveTransform,
} from '../handlers/core/step-handlers';
import {
  handleFileSelect,
  handleFileDrop,
  showReplaceSourceDialog,
  showEditTextDialog,
  updateJsonPath,
  resetJsonPath,
  selectJsonPathSegment,
  updateHeadersForPreview,
  updateImportPreview,
  backToUrlImport,
  backToTextEntry,
  fetchAndImportFromUrl,
  handleSheetChange,
} from '../handlers/import/import-handlers';
import {
  getStepsJson,
  enterJsonEditMode,
  cancelJsonEdit,
  applyJsonEdit,
} from '../handlers/import/json-handlers';
import {
  getPaginatedData,
  getPaginationInfo,
  previousPage,
  nextPage,
  goToFirstPage,
  goToLastPage,
  updatePageSize,
} from '../handlers/core/pagination-handlers';
import { openColumnMenu, openTypeMenu, selectCell } from '../handlers/core/interaction-handlers';
import { AppController } from '../orchestration/AppController';
import styles from './App.module.css';

import tableStyles from './DataTable.module.css';

export function App() {
  const activeDialog = AppStore.activeDialog.value;

  // Focus traps for dialogs
  const slidePanelRef = useFocusTrap<HTMLDivElement>(isSlidePanel(activeDialog));
  const centeredModalRef = useFocusTrap<HTMLDivElement>(isCenteredModal(activeDialog));

  // Computed signals: prevent App from subscribing to rapidly-changing dialog signals.
  // Without useComputed, reading e.g. expression.value inside hasError() during render
  // would cause the entire App tree to re-render on every keystroke.
  const dialogError = useComputed(() => activeDialogHasError());
  const dialogErrorMessage = useComputed(() => getActiveDialogError());
  const isApplying = useComputed(() => AppStore.isTransforming.value);
  const hasPreview = useComputed(() => hasPreviewData());
  const previewStats = useComputed(() => getPreviewStats());
  const previewTitle = useComputed(() => getPreviewTitle());
  const dialogTitle = getDialogTitle();
  const buttonText = getDialogButtonText();

  // Props Construction
  const sidebarProps = {
    onUploadClick: () => AppController.handleUploadClick(),
    onUrlClick: () => openDialog('import-url'),
    onEnterDataClick: () => openDialog('import-text'),
    onGenerateClick: () => openDialog('generate'),
    onSwitchToSource: (s: any) => AppController.switchToSource(s),
    onSwitchToModel: (m: any) => AppController.switchToModel(m),
    onViewStep: (i: number) => viewStep(i),
    onEditStep: (i: number) => editStep(i),
    onRemoveStep: (i: number) => removeStep(i),
    onViewFinalResult: () => viewFinalResult(),
    onForkAtStep: () => AppController.forkModelAtStep(),
    onUndo: () => undo(),
    onRedo: () => redo(),
    onGetStepsJson: () => getStepsJson(),
    onEnterJsonEditMode: () => enterJsonEditMode(),
    getModelMeta: (m: any) => getModelMeta(m),
  };

  const mainContentProps = {
    // EmptyState
    onUploadClick: () => AppController.handleUploadClick(),
    onUrlClick: () => openDialog('import-url'),
    onEnterDataClick: () => openDialog('import-text'),
    onFileDrop: (e: DragEvent) => handleFileDrop(e),
    // DatasetInfo
    onRenameSource: (s: any) => AppController.renameSource(s),
    onDeleteSource: (s: any) => AppController.deleteSource(s),
    onSwitchToModel: (m: any) => AppController.switchToModel(m),
    onCreateNewModel: (s: any) => AppController.createNewModel(s),
    onReplaceSource: (s: any) => showReplaceSourceDialog(s),
    onRestoreBackup: (s: any) => AppController.restoreSourceBackup(s),
    onEditData: (s: any) => showEditTextDialog(s),
    // ModelInfo
    onModelInfo: () => AppController.showModelInfo(),
    // Pagination
    onRenameModel: () => AppController.renameCurrentModel(),
    onCopyModel: () => AppController.copyCurrentModel(),
    onCreateNewModelFromActive: () => AppController.createNewModelFromActive(),
    onDeleteModel: () => AppController.deleteCurrentModel(),
    onOpenDialog: (d: any) => openDialog(d),
    onCopyCSV: () => AppController.copyCSVToClipboard(),
    onCopyJSON: () => AppController.copyJSONToClipboard(),
    onFirstPage: () => goToFirstPage(),
    onPrevPage: () => previousPage(),
    onNextPage: () => nextPage(),
    onLastPage: () => goToLastPage(),
    onPageSizeChange: (s: any) => updatePageSize(s),
    getPaginationInfo: () => getPaginationInfo(),
    // DataTable
    getPaginatedData: () => getPaginatedData(),
    getColumnType: (c: string) => getColumnType(c),
    getTypeIcon: (c: string) => getTypeIcon(c),
    formatCellValue: (v: any) => formatCellValue(v),
    formatCellValueForTooltip: (v: any) => formatCellValueForTooltip(v),
    onSelectColumn: (c: string, e: MouseEvent) => {
      e.stopPropagation();
      AppController.selectColumn(c, { shift: e.shiftKey, meta: e.metaKey || e.ctrlKey });
    },
    onSelectCell: (c: string, value: any, i: number, e: MouseEvent) => {
      e.stopPropagation();
      selectCell(c, value, i);
    },
    onSelectRow: (absoluteIdx: number, e: MouseEvent) => {
      e.stopPropagation();
      AppController.selectRow(absoluteIdx, { shift: e.shiftKey, meta: e.metaKey || e.ctrlKey });
    },
    onOpenColumnMenu: (c: string, e: MouseEvent) => {
      e.stopPropagation();
      openColumnMenu(c, e);
    },
    onOpenTypeMenu: (c: string, pos: { x: number; y: number }) => openTypeMenu(c, pos),
    onScroll: () => {}, // Table scroll handler removed - not needed
  };

  const typeMenuProps = {
    onChangeType: (c: string, t: string) => AppController.changeColumnType(c, t),
    onClose: () => {
      AppStore.typeMenuOpen.value = false;
    },
    onOpenTypeConversionDialog: (col: string, type: string) => {
      DialogStore.typeConversionState.column.value = col;
      DialogStore.typeConversionState.targetType.value = type;
      AppStore.activeDialog.value = 'type-conversion';
    },
  };

  return (
    <div class={styles.appContainer}>
      <a href="#main-content" class="visually-hidden">
        {i18n.t('common:buttons.skipToContent')}
      </a>
      <input
        type="file"
        id="file-input"
        class={styles.fileInput}
        accept=".csv,.tsv,.txt,.json,.xls,.xlsx,.ods"
        onChange={(e) => handleFileSelect(e)}
      />

      <AppHeader
        onOpenDialog={(d: any) => openDialog(d)}
        onLogoClick={() => AppController.goHome()}
      />
      <RibbonToolbar
        onOpenDialog={(d: any) => openDialog(d)}
        onAutoDetectSchema={() => AppController.autoDetectSchema()}
      />

      <div class={styles.mainLayoutRow}>
        <Sidebar {...sidebarProps} />

        <main id="main-content" class={styles.mainContent}>
          <MainContent {...mainContentProps} />
          <EdaPanel />
        </main>

        {/* Slide Panel Shell */}
        {isSlidePanel(activeDialog) && (
          <div
            class={`${styles.slidePanelShell} ${styles.open} ${hasPreview.value ? styles.hasPreview : ''} ${activeDialog === 'join' ? styles.joinDialog : ''}`}
          >
            {/* Backdrop */}
            <div
              class={`${styles.backdrop} ${hasPreview.value ? styles.blurred : ''}`}
              onClick={() => closeDialog()}
            />

            {/* Panel */}
            <div
              ref={slidePanelRef}
              class={`${styles.slidePanel} ${styles.open}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="slide-panel-title"
            >
              <div class={styles.slidePanelHeader}>
                <h3 id="slide-panel-title">{dialogTitle}</h3>
                <button
                  onClick={() => closeDialog()}
                  class={styles.closeButton}
                  aria-label={i18n.t('common:buttons.close')}
                >
                  ×
                </button>
              </div>

              <div class={styles.slidePanelContent}>
                {activeDialog === 'filter' && <FilterDialog />}
                {activeDialog === 'derive' && <DeriveDialog />}
                {activeDialog === 'regexpMatch' && <RegexpMatchDialog />}
                {activeDialog === 'regexpExtract' && <RegexpExtractDialog />}
                {activeDialog === 'date' && <DateDialog />}
                {activeDialog === 'parseDate' && <ParseDateDialog />}
                {activeDialog === 'text' && <TextDialog />}
                {activeDialog === 'dedupe' && <DedupeDialog />}
                {activeDialog === 'sort' && <SortDialog />}
                {activeDialog === 'sliceRows' && <SliceRowsDialog />}
                {activeDialog === 'sample' && <SampleDialog />}
                {activeDialog === 'spread' && <SpreadDialog />}
                {activeDialog === 'unroll' && <UnrollDialog />}
                {activeDialog === 'index' && <IndexDialog />}
                {activeDialog === 'fold' && <UnpivotDialog />}
                {activeDialog === 'pivot' && <PivotDialog />}
                {activeDialog === 'replace' && <ReplaceDialog />}
                {activeDialog === 'split' && <SplitDialog />}
                {activeDialog === 'merge' && <MergeDialog />}
                {activeDialog === 'join' && <JoinDialog />}
                {activeDialog === 'append' && <AppendDialog />}
                {activeDialog === 'aggregate' && <AggregateDialog />}
                {activeDialog === 'describe' && <DescribeDialog />}
                {activeDialog === 'window' && <WindowDialog />}
                {activeDialog === 'column-editor' && <ColumnEditorDialog />}
                {activeDialog === 'import-csv' && (
                  <ImportCsvDialog
                    onJsonPathUpdate={() => updateJsonPath()}
                    onJsonPathReset={() => resetJsonPath()}
                    onJsonPathSegmentSelect={(key) => selectJsonPathSegment(key)}
                    onParamChange={() => {
                      if (
                        DialogStore.importCsvState.isJson.value ||
                        DialogStore.importCsvState.isExcel.value
                      ) {
                        updateHeadersForPreview();
                      } else {
                        updateImportPreview();
                      }
                    }}
                    onBackToUrl={() => backToUrlImport()}
                    onBackToText={() => backToTextEntry()}
                    onSheetChange={(index) => handleSheetChange(index)}
                  />
                )}
                {activeDialog === 'import-url' && (
                  <ImportUrlDialog onImport={() => fetchAndImportFromUrl()} />
                )}
                {activeDialog === 'import-text' && <ImportTextDialog />}
                {activeDialog === 'generate' && <GenerateDialog />}
                {activeDialog === 'impute' && <ImputeDialog />}
                {activeDialog === 'conditional' && <ConditionalDialog />}
                {activeDialog === 'promoteHeader' && <PromoteHeaderDialog />}
                {activeDialog === 'selectPattern' && <SelectPatternDialog />}
                {activeDialog === 'removePattern' && <RemovePatternDialog />}
                {activeDialog === 'renamePattern' && <RenamePatternDialog />}
              </div>

              <div class={styles.slidePanelFooter}>
                <button class="button button--secondary" onClick={() => closeDialog()}>
                  {i18n.t('common:buttons.cancel')}
                </button>
                <button
                  class="button button--primary"
                  onClick={() => !dialogError.value && !isApplying.value && applyActiveTransform()}
                  aria-disabled={dialogError.value || isApplying.value || undefined}
                  title={dialogErrorMessage.value || undefined}
                >
                  {isApplying.value ? i18n.t('common:statusBar.processing') : buttonText}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Panel Shell */}
        {hasPreview.value &&
          isSlidePanel(activeDialog) &&
          (() => {
            const previewCols = getPreviewColumns();
            const previewRows = getPreviewRows();
            return (
              <div
                class={`${styles.previewPanelShell} ${activeDialog === 'join' ? styles.joinDialog : ''}`}
              >
                <div class={styles.previewPanel}>
                  <div class={styles.previewPanelHeader}>
                    <h4>{previewTitle.value || 'Preview'}</h4>
                    <div dangerouslySetInnerHTML={{ __html: previewStats.value }}></div>
                  </div>
                  <div class={styles.previewPanelContent}>
                    <div class={tableStyles.tableContainer}>
                      <table class={tableStyles.dataTable}>
                        <thead>
                          <tr>
                            {previewCols.map((col: string) => (
                              <th
                                key={col}
                                class={`${tableStyles.dataTable__header} ${isNewPreviewColumn(col) ? styles.previewNewCol : ''}`}
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row: any, i: number) => (
                            <tr
                              key={i}
                              class={`${tableStyles.dataTable__row} ${row._removed ? tableStyles.removed : ''} ${row._hasError ? tableStyles.error : ''}`}
                            >
                              {previewCols.map((col: string) => {
                                const isRemovedColumn =
                                  row._removedColumns && row._removedColumns.includes(col);
                                const cellValue = row[col];
                                const isError = isConversionError(cellValue);
                                return (
                                  <td
                                    key={col}
                                    class={`${tableStyles.cell} ${row._removed || isRemovedColumn ? tableStyles.removed : ''} ${isNewPreviewColumn(col) ? styles.previewNewCol : ''} ${isError ? tableStyles.error : ''} ${cellValue === null || cellValue === undefined || cellValue === '' ? tableStyles.empty : ''}`}
                                    title={isError ? cellValue.message : undefined}
                                  >
                                    {formatCellValue(cellValue)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>

      {/* Centered Modal Shell */}
      {isCenteredModal(activeDialog) && (
        <div class={styles.centeredModalBackdrop} onClick={() => closeDialog()}>
          <div
            ref={centeredModalRef}
            class={styles.centeredModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="centered-modal-title"
            style={{
              width:
                activeDialog === 'dependency-graph'
                  ? '66vw'
                  : activeDialog === 'expressions' || activeDialog === 'reference'
                    ? '80vw'
                    : undefined,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {activeDialog === 'type-conversion' ? (
              <TypeConversionDialog
                onCancel={() => {
                  closeDialog();
                  DialogStore.typeConversionState.column.value = null;
                  DialogStore.typeConversionState.targetType.value = null;
                  DialogStore.previewState.title.value = '';
                  DialogStore.previewState.stats.value = '';
                  DialogStore.previewState.columns.value = [];
                  DialogStore.previewState.newColumns.value = [];
                  DialogStore.previewState.rows.value = [];
                }}
                onApply={async () => {
                  const col = DialogStore.typeConversionState.column.value;
                  const type = DialogStore.typeConversionState.targetType.value;
                  if (col && type) {
                    await AppController.changeColumnType(col, type);
                  }
                  closeDialog();
                  DialogStore.typeConversionState.column.value = null;
                  DialogStore.typeConversionState.targetType.value = null;
                  DialogStore.previewState.title.value = '';
                  DialogStore.previewState.stats.value = '';
                  DialogStore.previewState.columns.value = [];
                  DialogStore.previewState.newColumns.value = [];
                  DialogStore.previewState.rows.value = [];
                }}
              />
            ) : (
              <>
                <div class={styles.centeredModalHeader}>
                  <h3 id="centered-modal-title">{dialogTitle}</h3>
                  <button
                    onClick={() => closeDialog()}
                    class={styles.closeButton}
                    aria-label={i18n.t('common:buttons.close')}
                  >
                    ×
                  </button>
                </div>
                <div class={styles.centeredModalContent}>
                  <div style={{ display: activeDialog === 'settings' ? 'block' : 'none' }}>
                    <SettingsDialog
                      onThemeChange={(theme) => AppController.switchTheme(theme)}
                      onRowLimitChange={(limit) =>
                        AppController.updatePreviewRowLimit(String(limit))
                      }
                      onAnalyticsOptOutChange={(optOut) =>
                        AppController.updateAnalyticsOptOut(optOut)
                      }
                      onLanguageChange={(language) => AppController.switchLanguage(language)}
                      onClearAllData={() => AppController.clearAllData()}
                    />
                  </div>
                  <div style={{ display: activeDialog === 'download' ? 'block' : 'none' }}>
                    <DownloadDialog />
                  </div>

                  {(activeDialog === 'expressions' || activeDialog === 'reference') && (
                    <FunctionReferenceDialog />
                  )}
                  {activeDialog === 'dependency-graph' && <DependencyGraphDialog />}
                  {activeDialog === 'workflow-import' && <WorkflowImportDialog />}
                </div>
                {![
                  'expressions',
                  'reference',
                  'download',
                  'settings',
                  'dependency-graph',
                  'workflow-import',
                ].includes(activeDialog || '') && (
                  <div class={styles.centeredModalFooter}>
                    <button class="button button--secondary" onClick={() => closeDialog()}>
                      Cancel
                    </button>
                    <button
                      class="button button--primary"
                      onClick={() =>
                        !dialogError.value && !isApplying.value && applyActiveTransform()
                      }
                      aria-disabled={dialogError.value || isApplying.value || undefined}
                      title={dialogErrorMessage.value || undefined}
                    >
                      {isApplying.value ? i18n.t('common:statusBar.processing') : buttonText}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Toolbars & Global UI */}
      <ColumnToolbar
        onSort={(order: any) => AppController.quickSort(order)}
        onFilter={() => AppController.quickFilter()}
        onRename={() => AppController.quickRename()}
        onSplit={() => AppController.quickSplit()}
        onReplace={() => AppController.quickReplaceColumn()}
        onDate={() => AppController.quickDate()}
        onSpread={() => AppController.quickSpread()}
        onDedupe={() => AppController.quickDedupe()}
        onImpute={() => openDialog('impute')}
        onDuplicate={() => AppController.executeShortcut('duplicate')}
        onConvertType={() => {
          const col = AppStore.selectedColumn.value;
          if (col) AppController.openTypeMenuForColumn(col);
        }}
        onRemove={() => AppController.quickRemove()}
        onRemoveMultiple={() => AppController.quickRemoveMultiple()}
        getColumnType={(col: string) => getColumnType(col)}
      />
      <CellToolbar
        onFilter={(op: any) => AppController.applyQuickCellFilter(op)}
        onReplace={() => AppController.quickReplace()}
      />
      <RowToolbar
        onRemoveRows={() => AppController.removeSelectedRows()}
        onKeepRows={() => AppController.keepSelectedRows()}
        onExtractToModel={() => AppController.extractSelectedRows()}
        onPromoteToHeader={() => AppController.promoteSelectedRowToHeader()}
      />
      <TypeMenu {...typeMenuProps} />
      <GlobalUI />
      <DependencyImpactDialog />
      <JsonEditorModal onCancel={() => cancelJsonEdit()} onApply={() => applyJsonEdit()} />
    </div>
  );
}
