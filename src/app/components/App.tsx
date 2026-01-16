import { AppStore } from '../stores/AppStore';
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
  AggregateDialog,
  ImportCsvDialog,
  ImportUrlDialog,
  DownloadDialog,
  SettingsDialog,
  ColumnEditorDialog,
  RegexpMatchDialog,
  RegexpExtractDialog,
  DedupeDialog,
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
import { getModelMeta, getTypeIcon, formatCellValue } from '../handlers/helper-handlers';
import styles from './App.module.css';

import tableStyles from './DataTable.module.css';

interface AppProps {
  app: any; // ChumakApp instance
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
      'replace',
      'column-editor',
    ].includes(d);
  };

  const isCenteredModal = (d: string | null) => {
    if (!d) return false;
    return ['import-csv', 'import-url', 'settings', 'download', 'about', 'expressions'].includes(d);
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
    // Pagination
    onRenameModel: () => app.renameCurrentModel(),
    onCopyModel: () => app.copyCurrentModel(),
    onCreateNewModelFromActive: () => app.createNewModelFromActive(),
    onDeleteModel: () => app.deleteCurrentModel(),
    onOpenDialog: (d: any) => app.openDialog(d),
    onCopyCSV: () => app.copyCSVToClipboard(),
    onCopyJSON: () => app.copyJSONToClipboard(),
    onFirstPage: () => app.firstPage(),
    onPrevPage: () => app.prevPage(),
    onNextPage: () => app.nextPage(),
    onLastPage: () => app.lastPage(),
    onPageSizeChange: (s: any) => app.setPageSize(s),
    getPaginationInfo: () => (app.getPaginationInfo ? app.getPaginationInfo() : ''),
    // DataTable
    getPaginatedData: () => (app.getPaginatedData ? app.getPaginatedData() : []),
    getColumnType: (c: string) => app.getColumnType(c),
    getTypeIcon: (c: string) => getTypeIcon.call(app, c),
    formatCellValue: (v: any) => formatCellValue.call(app, v),
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
  };

  const typeMenuProps = {
    onChangeType: (c: string, t: string) => app.changeColumnType(c, t),
    onClose: () => {
      AppStore.typeMenuOpen.value = false;
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
        <div
          class={`${styles.slidePanelShell} ${isSlidePanel(activeDialog) ? styles.open : ''} ${hasPreview ? styles.hasPreview : ''} ${activeDialog === 'dedupe' ? styles.dedupe : ''}`}
        >
          {/* Backdrop */}
          {isSlidePanel(activeDialog) && (
            <div
              class={`${styles.backdrop} ${hasPreview ? styles.blurred : ''} ${activeDialog === 'dedupe' ? styles.dedupe : ''}`}
              onClick={() => app.closeDialog()}
            />
          )}

          {/* Panel */}
          <div class={`${styles.slidePanel} ${isSlidePanel(activeDialog) ? styles.open : ''}`}>
            <div class={styles.slidePanelHeader}>
              <h3>{dialogTitle}</h3>
              <button onClick={() => app.closeDialog()} class={styles.closeButton}>
                ×
              </button>
            </div>

            <div class={styles.slidePanelContent}>
              <div style={{ display: activeDialog === 'filter' ? 'block' : 'none' }}>
                <FilterDialog />
              </div>
              <div style={{ display: activeDialog === 'derive' ? 'block' : 'none' }}>
                <DeriveDialog />
              </div>
              <div style={{ display: activeDialog === 'regexpMatch' ? 'block' : 'none' }}>
                <RegexpMatchDialog />
              </div>
              <div style={{ display: activeDialog === 'regexpExtract' ? 'block' : 'none' }}>
                <RegexpExtractDialog />
              </div>
              <div style={{ display: activeDialog === 'date' ? 'block' : 'none' }}>
                <DateDialog />
              </div>
              <div style={{ display: activeDialog === 'dedupe' ? 'block' : 'none' }}>
                <DedupeDialog />
              </div>
              <div style={{ display: activeDialog === 'sort' ? 'block' : 'none' }}>
                <SortDialog />
              </div>
              <div style={{ display: activeDialog === 'sliceRows' ? 'block' : 'none' }}>
                <SliceRowsDialog />
              </div>
              <div style={{ display: activeDialog === 'index' ? 'block' : 'none' }}>
                <IndexDialog />
              </div>
              <div style={{ display: activeDialog === 'fold' ? 'block' : 'none' }}>
                <UnpivotDialog />
              </div>
              <div style={{ display: activeDialog === 'pivot' ? 'block' : 'none' }}>
                <PivotDialog />
              </div>
              <div style={{ display: activeDialog === 'replace' ? 'block' : 'none' }}>
                <ReplaceDialog />
              </div>
              <div style={{ display: activeDialog === 'split' ? 'block' : 'none' }}>
                <SplitDialog />
              </div>
              <div style={{ display: activeDialog === 'join' ? 'block' : 'none' }}>
                <JoinDialog />
              </div>
              <div style={{ display: activeDialog === 'aggregate' ? 'block' : 'none' }}>
                <AggregateDialog />
              </div>
              <div style={{ display: activeDialog === 'column-editor' ? 'block' : 'none' }}>
                <ColumnEditorDialog />
              </div>
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

        {/* Preview Panel Shell */}
        {hasPreview && isSlidePanel(activeDialog) && (
          <div
            class={`${styles.previewPanelShell} ${activeDialog === 'dedupe' ? styles.dedupe : ''}`}
          >
            <div class={styles.previewPanel}>
              <div class={styles.previewPanelHeader}>
                <h4>{previewTitle || 'Preview'}</h4>
                <div dangerouslySetInnerHTML={{ __html: previewStats }}></div>
              </div>
              <div class={styles.previewPanelContent}>
                <table class={tableStyles.dataTable} style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      {getPreviewColumns.call(app).map((col: string) => (
                        <th
                          key={col}
                          class={isNewPreviewColumn.call(app, col) ? styles.previewNewCol : ''}
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
                        class={`${tableStyles.dataTable__row} ${row._removed ? tableStyles.removed : ''}`}
                      >
                        {getPreviewColumns.call(app).map((col: string) => {
                          const isRemovedColumn =
                            row._removedColumns && row._removedColumns.includes(col);
                          return (
                            <td
                              key={col}
                              class={`${tableStyles.cell} ${row._removed || isRemovedColumn ? tableStyles.removed : ''} ${isNewPreviewColumn.call(app, col) ? styles.previewNewCol : ''}`}
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
        )}
      </div>

      {/* Centered Modal Shell */}
      {isCenteredModal(activeDialog) && (
        <div class={styles.centeredModalBackdrop} onClick={() => app.closeDialog()}>
          <div class={styles.centeredModal} onClick={(e) => e.stopPropagation()}>
            <div class={styles.centeredModalHeader}>
              <h3>{dialogTitle}</h3>
              <button onClick={() => app.closeDialog()} class={styles.closeButton}>
                ×
              </button>
            </div>
            <div class={styles.centeredModalContent}>
              <div style={{ display: activeDialog === 'import-csv' ? 'block' : 'none' }}>
                <ImportCsvDialog />
              </div>
              <div style={{ display: activeDialog === 'import-url' ? 'block' : 'none' }}>
                <ImportUrlDialog onImport={() => app.fetchAndImportFromUrl()} />
              </div>
              <div style={{ display: activeDialog === 'settings' ? 'block' : 'none' }}>
                <SettingsDialog
                  onThemeChange={(theme) => app.switchTheme(theme)}
                  onRowLimitChange={(limit) => app.updatePreviewRowLimit(String(limit))}
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
            {!['about', 'expressions', 'download'].includes(activeDialog || '') && (
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
