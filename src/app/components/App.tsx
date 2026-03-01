import { AppStore } from '../stores/AppStore';
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
  formatPreviewCell,
  activeDialogHasError,
} from '../orchestration/DialogCoordinator';
import { getDialogTitle, getDialogButtonText } from '../handlers/dialog/dialog-handlers';
import {
  getModelMeta,
  getTypeIcon,
  formatCellValue,
  formatCellValueForTooltip,
} from '../handlers/core/helper-handlers';
import { AppController } from '../orchestration/AppController';
import styles from './App.module.css';

import tableStyles from './DataTable.module.css';

export function App() {
  const activeDialog = AppStore.activeDialog.value;

  // Focus traps for dialogs
  const slidePanelRef = useFocusTrap<HTMLDivElement>(isSlidePanel(activeDialog));
  const centeredModalRef = useFocusTrap<HTMLDivElement>(isCenteredModal(activeDialog));

  // Helper Wrappers - pure functions that access stores directly
  const previewStats = getPreviewStats();
  const previewTitle = getPreviewTitle();
  const dialogTitle = getDialogTitle();
  const buttonText = getDialogButtonText();
  const hasPreview = hasPreviewData();
  const dialogError = activeDialogHasError();

  // Props Construction
  const sidebarProps = {
    onUploadClick: () => AppController.handleUploadClick(),
    onPasteClick: () => AppController.handlePasteClick(),
    onUrlClick: () => AppController.openDialog('import-url'),
    onGenerateClick: () => AppController.openDialog('generate'),
    onSwitchToSource: (s: any) => AppController.switchToSource(s),
    onSwitchToModel: (m: any) => AppController.switchToModel(m),
    onViewStep: (i: number) => AppController.viewStep(i),
    onEditStep: (i: number) => AppController.editStep(i),
    onRemoveStep: (i: number) => AppController.removeStep(i),
    onViewFinalResult: () => AppController.viewFinalResult(),
    onGetStepsJson: () => AppController.getStepsJson(),
    onEnterJsonEditMode: () => AppController.enterJsonEditMode(),
    getModelMeta: (m: any) => getModelMeta(m),
  };

  const mainContentProps = {
    // EmptyState
    onUploadClick: () => AppController.handleUploadClick(),
    onPasteClick: () => AppController.handlePasteClick(),
    onUrlClick: () => AppController.openDialog('import-url'),
    onFileDrop: (e: DragEvent) => AppController.handleFileDrop(e),
    onLoadExample: () => AppController.loadExampleData(),
    // DatasetInfo
    onRenameSource: (s: any) => AppController.renameSource(s),
    onDeleteSource: (s: any) => AppController.deleteSource(s),
    onSwitchToModel: (m: any) => AppController.switchToModel(m),
    onCreateNewModel: (s: any) => AppController.createNewModel(s),
    onReplaceSource: (s: any) => AppController.showReplaceSourceDialog(s),
    onRestoreBackup: (s: any) => AppController.restoreSourceBackup(s),
    // ModelInfo
    onModelInfo: () => AppController.showModelInfo(),
    // Pagination
    onRenameModel: () => AppController.renameCurrentModel(),
    onCopyModel: () => AppController.copyCurrentModel(),
    onCreateNewModelFromActive: () => AppController.createNewModelFromActive(),
    onDeleteModel: () => AppController.deleteCurrentModel(),
    onOpenDialog: (d: any) => AppController.openDialog(d),
    onCopyCSV: () => AppController.copyCSVToClipboard(),
    onCopyJSON: () => AppController.copyJSONToClipboard(),
    onFirstPage: () => AppController.goToFirstPage(),
    onPrevPage: () => AppController.previousPage(),
    onNextPage: () => AppController.nextPage(),
    onLastPage: () => AppController.goToLastPage(),
    onPageSizeChange: (s: any) => AppController.updatePageSize(s),
    getPaginationInfo: () => AppController.getPaginationInfo(),
    // DataTable
    getPaginatedData: () => AppController.getPaginatedData(),
    getColumnType: (c: string) => AppController.getColumnType(c),
    getTypeIcon: (c: string) => getTypeIcon(c),
    formatCellValue: (v: any) => formatCellValue(v),
    formatCellValueForTooltip: (v: any) => formatCellValueForTooltip(v),
    onSelectColumn: (c: string, e: MouseEvent) => {
      e.stopPropagation();
      AppController.selectColumn(c, { shift: e.shiftKey, meta: e.metaKey || e.ctrlKey });
    },
    onSelectCell: (c: string, value: any, i: number, e: MouseEvent) => {
      e.stopPropagation();
      AppController.selectCell(c, value, i);
    },
    onSelectRow: (absoluteIdx: number, e: MouseEvent) => {
      e.stopPropagation();
      AppController.selectRow(absoluteIdx, { shift: e.shiftKey, meta: e.metaKey || e.ctrlKey });
    },
    onOpenTypeMenu: (c: string, pos: { x: number; y: number }) =>
      AppController.openTypeMenu(c, pos),
    onScroll: () => {}, // Table scroll handler removed - not needed
    onErrorCellClick: (message: string) => {
      AppController.alert(message, 'Conversion Error');
    },
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
      <input
        type="file"
        id="file-input"
        class={styles.fileInput}
        onChange={(e) => AppController.handleFileSelect(e)}
      />

      <AppHeader onOpenDialog={(d: any) => AppController.openDialog(d)} />
      <RibbonToolbar
        onOpenDialog={(d: any) => AppController.openDialog(d)}
        onAutoDetectSchema={() => AppController.autoDetectSchema()}
      />

      <div class={styles.mainLayoutRow}>
        <Sidebar {...sidebarProps} />

        <main class={styles.mainContent}>
          <MainContent {...mainContentProps} />
          <EdaPanel />
        </main>

        {/* Slide Panel Shell */}
        {isSlidePanel(activeDialog) && (
          <div
            class={`${styles.slidePanelShell} ${styles.open} ${hasPreview ? styles.hasPreview : ''} ${activeDialog === 'join' ? styles.joinDialog : ''}`}
          >
            {/* Backdrop */}
            <div
              class={`${styles.backdrop} ${hasPreview ? styles.blurred : ''}`}
              onClick={() => AppController.closeDialog()}
            />

            {/* Panel */}
            <div ref={slidePanelRef} class={`${styles.slidePanel} ${styles.open}`}>
              <div class={styles.slidePanelHeader}>
                <h3>{dialogTitle}</h3>
                <button onClick={() => AppController.closeDialog()} class={styles.closeButton}>
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
                {activeDialog === 'window' && <WindowDialog />}
                {activeDialog === 'column-editor' && <ColumnEditorDialog />}
                {activeDialog === 'import-csv' && (
                  <ImportCsvDialog
                    onJsonPathUpdate={() => AppController.updateJsonPath()}
                    onJsonPathReset={() => AppController.resetJsonPath()}
                    onJsonPathSegmentSelect={(key) => AppController.selectJsonPathSegment(key)}
                    onParamChange={() => {
                      if (DialogStore.importCsvState.isJson.value) {
                        AppController.updateHeadersForPreview();
                      } else {
                        AppController.updateImportPreview();
                      }
                    }}
                  />
                )}
                {activeDialog === 'import-url' && (
                  <ImportUrlDialog onImport={() => AppController.fetchAndImportFromUrl()} />
                )}
                {activeDialog === 'generate' && <GenerateDialog />}
                {activeDialog === 'impute' && <ImputeDialog />}
                {activeDialog === 'conditional' && <ConditionalDialog />}
              </div>

              <div class={styles.slidePanelFooter}>
                <button
                  class="button button--secondary"
                  onClick={() => AppController.closeDialog()}
                >
                  Cancel
                </button>
                <button
                  class="button button--primary"
                  onClick={() => AppController.applyActiveTransform()}
                  disabled={dialogError}
                >
                  {buttonText}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Panel Shell */}
        {hasPreview && isSlidePanel(activeDialog) && (
          <div
            class={`${styles.previewPanelShell} ${activeDialog === 'join' ? styles.joinDialog : ''}`}
          >
            <div class={styles.previewPanel}>
              <div class={styles.previewPanelHeader}>
                <h4>{previewTitle || 'Preview'}</h4>
                <div dangerouslySetInnerHTML={{ __html: previewStats }}></div>
              </div>
              <div class={styles.previewPanelContent}>
                <div class={tableStyles.tableContainer}>
                  <table class={tableStyles.dataTable}>
                    <thead>
                      <tr>
                        {getPreviewColumns().map((col: string) => (
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
                      {getPreviewRows().map((row: any, i: number) => (
                        <tr
                          key={i}
                          class={`${tableStyles.dataTable__row} ${row._removed ? tableStyles.removed : ''} ${row._hasError ? tableStyles.error : ''}`}
                        >
                          {getPreviewColumns().map((col: string) => {
                            const isRemovedColumn =
                              row._removedColumns && row._removedColumns.includes(col);
                            const cellValue = row[col];
                            const isError =
                              cellValue &&
                              typeof cellValue === 'object' &&
                              'type' in cellValue &&
                              cellValue.type === 'error';
                            return (
                              <td
                                key={col}
                                class={`${tableStyles.cell} ${row._removed || isRemovedColumn ? tableStyles.removed : ''} ${isNewPreviewColumn(col) ? styles.previewNewCol : ''} ${isError ? tableStyles.error : ''}`}
                                title={isError ? cellValue.message : undefined}
                              >
                                {formatPreviewCell(row, col)}
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
        )}
      </div>

      {/* Centered Modal Shell */}
      {isCenteredModal(activeDialog) && (
        <div class={styles.centeredModalBackdrop} onClick={() => AppController.closeDialog()}>
          <div
            ref={centeredModalRef}
            class={styles.centeredModal}
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
                  AppController.closeDialog();
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
                  AppController.closeDialog();
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
                  <h3>{dialogTitle}</h3>
                  <button onClick={() => AppController.closeDialog()} class={styles.closeButton}>
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
                </div>
                {!['expressions', 'reference', 'download', 'settings', 'dependency-graph'].includes(
                  activeDialog || ''
                ) && (
                  <div class={styles.centeredModalFooter}>
                    <button
                      class="button button--secondary"
                      onClick={() => AppController.closeDialog()}
                    >
                      Cancel
                    </button>
                    <button
                      class="button button--primary"
                      onClick={() => AppController.applyActiveTransform()}
                      disabled={dialogError}
                    >
                      {buttonText}
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
        onDate={() => AppController.quickDate()}
        onDedupe={() => AppController.quickDedupe()}
        onImpute={() => AppController.openDialog('impute')}
        onRemove={() => AppController.quickRemove()}
        onRemoveMultiple={() => AppController.quickRemoveMultiple()}
        getColumnType={(col: string) => AppController.getColumnType(col)}
      />
      <CellToolbar
        onFilter={(op: any) => AppController.applyQuickCellFilter(op)}
        onReplace={() => AppController.quickReplace()}
      />
      <RowToolbar
        onRemoveRows={() => AppController.removeSelectedRows()}
        onKeepRows={() => AppController.keepSelectedRows()}
        onExtractToModel={() => AppController.extractSelectedRows()}
      />
      <TypeMenu {...typeMenuProps} />
      <GlobalUI />
      <DependencyImpactDialog />
      <JsonEditorModal
        onCancel={() => AppController.cancelJsonEdit()}
        onApply={() => AppController.applyJsonEdit()}
      />
    </div>
  );
}
