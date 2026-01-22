import { AppStore } from '../stores/AppStore';
import { DialogStore } from '../stores/DialogStore';
import { AppHeader } from './AppHeader';
import { RibbonToolbar } from './RibbonToolbar';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { EdaPanel } from './EdaPanel';
import { ColumnToolbar } from './ColumnToolbar';
import { CellToolbar } from './CellToolbar';
import { GlobalUI } from './GlobalUI';
import { TypeMenu } from './TypeMenu';
import {
  SortDialog,
  IndexDialog,
  ReplaceDialog,
  SliceRowsDialog,
  UnpivotDialog,
  FilterDialog,
  PivotDialog,
  DateDialog,
  SplitDialog,
  DeriveDialog,
  JoinDialog,
  ConcatDialog,
  UnionDialog,
  AggregateDialog,
  ImportCsvDialog,
  ImportUrlDialog,
  DownloadDialog,
  SettingsDialog,
  ColumnEditorDialog,
  RegexpMatchDialog,
  RegexpExtractDialog,
  DedupeDialog,
  TypeConversionDialog,
  ImputeDialog,
  SelectPatternDialog,
  RemovePatternDialog,
  ConditionalDialog,
  RenamePatternDialog,
} from './index';
// Import handlers for helpers
import {
  getDialogTitle,
  getDialogButtonText,
  getAboutContent,
  getExpressionsContent,
  getPreviewTitle,
  getPreviewStats,
  hasPreviewData,
  isNewPreviewColumn,
  getPreviewColumns,
  getPreviewRows,
  formatPreviewCell,
  activeDialogError,
} from '../handlers/dialog-handlers';
import {
  getModelMeta,
  getTypeIcon,
  formatCellValue,
  formatCellValueForTooltip,
} from '../handlers/helper-handlers';
import styles from './App.module.css';

import tableStyles from './DataTable.module.css';

interface AppProps {
  app: any; // SytoApp instance
}

export function App({ app }: AppProps) {
  const activeDialog = AppStore.activeDialog.value;

  // Helpers copied/wrapped
  const isSlidePanel = (d: string | null) => {
    if (!d) return false;
    return [
      'filter',
      'sort',
      'sliceRows',
      'index',
      'split',
      'derive',
      'regexpMatch',
      'regexpExtract',
      'date',
      'dedupe',
      'fold',
      'pivot',
      'aggregate',
      'join',
      'concat',
      'union',
      'replace',
      'column-editor',
      'import-csv',
      'import-url',
      'impute',
      'selectPattern',
      'removePattern',
      'conditional',
      'renamePattern',
    ].includes(d);
  };

  const isCenteredModal = (d: string | null) => {
    if (!d) return false;
    return ['settings', 'download', 'about', 'expressions', 'type-conversion'].includes(d);
  };

  // Helper Wrappers
  const previewStats = getPreviewStats.call(app);
  const previewTitle = getPreviewTitle.call(app);
  const dialogTitle = getDialogTitle.call(app);
  const buttonText = getDialogButtonText.call(app);
  const aboutHtml = activeDialog === 'about' ? getAboutContent.call(app) : '';
  const expressionsHtml = activeDialog === 'expressions' ? getExpressionsContent.call(app) : '';
  const hasPreview = hasPreviewData.call(app);
  const dialogError = activeDialogError.call(app);

  // Props Construction
  const sidebarProps = {
    onUploadClick: () => app.handleUploadClick(),
    onPasteClick: () => app.handlePasteClick(),
    onUrlClick: () => app.openDialog('import-url'),
    onSwitchToSource: (s: any) => app.switchToSource(s),
    onSwitchToModel: (m: any) => app.switchToModel(m),
    onViewStep: (i: number) => app.viewStep(i),
    onEditStep: (i: number) => app.editStep(i),
    onRemoveStep: (i: number) => app.removeStep(i),
    onViewFinalResult: () => app.viewFinalResult(),
    onGetStepsJson: () => JSON.stringify(app.activeModel?.steps, null, 2),
    onEnterJsonEditMode: () => app.enterJsonEditMode(),
    onCancelJsonEdit: () => app.cancelJsonEdit(),
    onApplyJsonEdit: () => app.applyJsonEdit(),
    onValidateJsonEdit: () => app.validateJsonEdit(),
    getModelMeta: (m: any) => getModelMeta.call(app, m),
  };

  const mainContentProps = {
    // EmptyState
    onUploadClick: () => app.handleUploadClick(),
    onPasteClick: () => app.handlePasteClick(),
    onUrlClick: () => app.openDialog('import-url'),
    onFileDrop: (e: DragEvent) => app.handleFileDrop(e),
    // DatasetInfo
    onRenameSource: (s: any) => app.renameSource(s),
    onDeleteSource: (s: any) => app.deleteSource(s),
    onSwitchToModel: (m: any) => app.switchToModel(m),
    onCreateNewModel: (s: any) => app.createNewModel(s),
    // ModelInfo
    onModelInfo: () => app.showModelInfo && app.showModelInfo(),
    // Pagination
    onRenameModel: () => app.renameCurrentModel(),
    onCopyModel: () => app.copyCurrentModel(),
    onCreateNewModelFromActive: () => app.createNewModelFromActive(),
    onDeleteModel: () => app.deleteCurrentModel(),
    onOpenDialog: (d: any) => app.openDialog(d),
    onCopyCSV: () => app.copyCSVToClipboard(),
    onCopyJSON: () => app.copyJSONToClipboard(),
    onFirstPage: () => app.goToFirstPage(),
    onPrevPage: () => app.previousPage(),
    onNextPage: () => app.nextPage(),
    onLastPage: () => app.goToLastPage(),
    onPageSizeChange: (s: any) => app.setPageSize(s),
    getPaginationInfo: () => (app.getPaginationInfo ? app.getPaginationInfo() : ''),
    // DataTable
    getPaginatedData: () => (app.getPaginatedData ? app.getPaginatedData() : []),
    getColumnType: (c: string) => app.getColumnType(c),
    getTypeIcon: (c: string) => getTypeIcon.call(app, c),
    formatCellValue: (v: any) => formatCellValue.call(app, v),
    formatCellValueForTooltip: (v: any) => formatCellValueForTooltip.call(app, v),
    onSelectColumn: (c: string, e: MouseEvent) => {
      e.stopPropagation();
      app.selectColumn(c);
    },
    onSelectCell: (c: string, value: any, i: number, e: MouseEvent) => {
      e.stopPropagation();
      app.selectCell(c, value, i);
    },
    onOpenTypeMenu: (c: string, pos: { x: number; y: number }) => app.openTypeMenu(c, pos),
    onClearColumnSelection: () => app.clearColumnSelection(),
    onScroll: (e?: Event) => app.handleTableScroll && app.handleTableScroll(e!),
    onErrorCellClick: (message: string) => {
      app.alert(message, 'Conversion Error');
    },
  };

  const typeMenuProps = {
    onChangeType: (c: string, t: string) => app.changeColumnType(c, t),
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
        onChange={(e) => app.handleFileSelect(e)}
      />

      <AppHeader
        onOpenDialog={(d: any) => app.openDialog(d)}
        onClearAllData={() => app.clearAllData()}
      />
      <RibbonToolbar
        onOpenDialog={(d: any) => app.openDialog(d)}
        onAutoDetectSchema={() => app.autoDetectSchema && app.autoDetectSchema()}
      />

      <div class={styles.mainLayoutRow}>
        <Sidebar {...sidebarProps} />

        <main class={styles.mainContent}>
          <MainContent {...mainContentProps} />
          <EdaPanel onApplyFilter={() => app.applyFilterTransform()} />
        </main>

        {/* Slide Panel Shell */}
        {isSlidePanel(activeDialog) && (
          <div
            class={`${styles.slidePanelShell} ${styles.open} ${hasPreview ? styles.hasPreview : ''} ${activeDialog === 'join' ? styles.joinDialog : ''}`}
          >
            {/* Backdrop */}
            <div
              class={`${styles.backdrop} ${hasPreview ? styles.blurred : ''}`}
              onClick={() => app.closeDialog()}
            />

            {/* Panel */}
            <div class={`${styles.slidePanel} ${styles.open}`}>
              <div class={styles.slidePanelHeader}>
                <h3>{dialogTitle}</h3>
                <button onClick={() => app.closeDialog()} class={styles.closeButton}>
                  ×
                </button>
              </div>

              <div class={styles.slidePanelContent}>
                {activeDialog === 'filter' && <FilterDialog />}
                {activeDialog === 'derive' && <DeriveDialog />}
                {activeDialog === 'regexpMatch' && <RegexpMatchDialog />}
                {activeDialog === 'regexpExtract' && <RegexpExtractDialog />}
                {activeDialog === 'date' && <DateDialog />}
                {activeDialog === 'dedupe' && <DedupeDialog />}
                {activeDialog === 'sort' && <SortDialog />}
                {activeDialog === 'sliceRows' && <SliceRowsDialog />}
                {activeDialog === 'index' && <IndexDialog />}
                {activeDialog === 'fold' && <UnpivotDialog />}
                {activeDialog === 'pivot' && <PivotDialog />}
                {activeDialog === 'replace' && <ReplaceDialog />}
                {activeDialog === 'split' && <SplitDialog />}
                {activeDialog === 'join' && <JoinDialog />}
                {activeDialog === 'concat' && <ConcatDialog />}
                {activeDialog === 'union' && <UnionDialog />}
                {activeDialog === 'aggregate' && <AggregateDialog />}
                {activeDialog === 'column-editor' && <ColumnEditorDialog />}
                {activeDialog === 'import-csv' && <ImportCsvDialog />}
                {activeDialog === 'import-url' && (
                  <ImportUrlDialog onImport={() => app.fetchAndImportFromUrl()} />
                )}
                {activeDialog === 'impute' && <ImputeDialog />}
                {activeDialog === 'selectPattern' && <SelectPatternDialog />}
                {activeDialog === 'removePattern' && <RemovePatternDialog />}
                {activeDialog === 'conditional' && <ConditionalDialog />}
                {activeDialog === 'renamePattern' && <RenamePatternDialog />}
              </div>

              <div class={styles.slidePanelFooter}>
                <button class="button button--secondary" onClick={() => app.closeDialog()}>
                  Cancel
                </button>
                <button
                  class="button button--primary"
                  onClick={() => app.applyActiveTransform()}
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
                        {getPreviewColumns.call(app).map((col: string) => (
                          <th
                            key={col}
                            class={`${tableStyles.dataTable__header} ${isNewPreviewColumn.call(app, col) ? styles.previewNewCol : ''}`}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getPreviewRows.call(app).map((row: any, i: number) => (
                        <tr
                          key={i}
                          class={`${tableStyles.dataTable__row} ${row._removed ? tableStyles.removed : ''} ${row._hasError ? tableStyles.error : ''}`}
                        >
                          {getPreviewColumns.call(app).map((col: string) => {
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
                                class={`${tableStyles.cell} ${row._removed || isRemovedColumn ? tableStyles.removed : ''} ${isNewPreviewColumn.call(app, col) ? styles.previewNewCol : ''} ${isError ? tableStyles.error : ''}`}
                                title={isError ? cellValue.message : undefined}
                              >
                                {formatPreviewCell.call(app, row, col)}
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
        <div class={styles.centeredModalBackdrop} onClick={() => app.closeDialog()}>
          <div class={styles.centeredModal} onClick={(e) => e.stopPropagation()}>
            {activeDialog === 'type-conversion' ? (
              <TypeConversionDialog
                app={app}
                onCancel={() => {
                  app.closeDialog();
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
                    await app.changeColumnType(col, type);
                  }
                  app.closeDialog();
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
                  <button onClick={() => app.closeDialog()} class={styles.closeButton}>
                    ×
                  </button>
                </div>
                <div class={styles.centeredModalContent}>
                  <div style={{ display: activeDialog === 'settings' ? 'block' : 'none' }}>
                    <SettingsDialog
                      onThemeChange={(theme) => app.switchTheme(theme)}
                      onRowLimitChange={(limit) => app.updatePreviewRowLimit(String(limit))}
                      onAnalyticsOptOutChange={(optOut) => app.updateAnalyticsOptOut(optOut)}
                    />
                  </div>
                  <div style={{ display: activeDialog === 'download' ? 'block' : 'none' }}>
                    <DownloadDialog />
                  </div>

                  {activeDialog === 'about' && (
                    <div
                      id="about-modal-container"
                      dangerouslySetInnerHTML={{ __html: aboutHtml }}
                    ></div>
                  )}
                  {activeDialog === 'expressions' && (
                    <div
                      id="expressions-modal-container"
                      dangerouslySetInnerHTML={{ __html: expressionsHtml }}
                    ></div>
                  )}
                </div>
                {!['about', 'expressions', 'download', 'settings'].includes(activeDialog || '') && (
                  <div class={styles.centeredModalFooter}>
                    <button class="button button--secondary" onClick={() => app.closeDialog()}>
                      Cancel
                    </button>
                    <button
                      class="button button--primary"
                      onClick={() => app.applyActiveTransform()}
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
        onSort={(order: any) => app.quickSort(order)}
        onFilter={() => app.quickFilter()}
        onRename={() => app.quickRename()}
        onSplit={() => app.quickSplit()}
        onDate={() => app.quickDate()}
        onDedupe={() => app.quickDedupe()}
        onImpute={() => app.openDialog('impute')}
        onRemove={() => app.quickRemove()}
        getColumnType={(col: string) => app.getColumnType(col)}
      />
      <CellToolbar
        onFilter={(op: any) => app.applyQuickCellFilter(op)}
        onReplace={() => app.quickReplace()}
      />
      <TypeMenu {...typeMenuProps} />
      <GlobalUI />
    </div>
  );
}
