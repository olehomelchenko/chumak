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
import { LegacyContainer } from './LegacyContainer';
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
  getCellClass,
  formatCellValue,
} from '../handlers/helper-handlers';

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
    getCellClass: (v: any, c: string) => getCellClass.call(app, v, c),
    formatCellValue: (v: any) => formatCellValue.call(app, v),
    onSelectColumn: (c: string, e: MouseEvent) => app.selectColumn(c, e),
    onSelectCell: (c: string, _v: any, i: number, e: MouseEvent) => {
      const rows = app.getPaginatedData ? app.getPaginatedData() : [];
      const row = rows[i];
      app.selectCell(row, c, e);
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
    <div id="app-root" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <input
        type="file"
        id="file-input"
        style={{ display: 'none' }}
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

      <div class="main-layout-row" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar {...sidebarProps} />

        <main
          class="main-content"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            position: 'relative',
          }}
        >
          <MainContent {...mainContentProps} />
          <EdaPanel onApplyFilter={() => app.applyFilterTransform()} />
        </main>

        {/* Slide Panel Shell */}
        <div
          class={`slide-panel-shell ${isSlidePanel(activeDialog) ? 'open' : ''} ${hasPreview ? 'has-preview' : ''}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width:
              isSlidePanel(activeDialog) && activeDialog !== 'dedupe'
                ? '600px'
                : activeDialog === 'dedupe'
                  ? '800px'
                  : '0',
            pointerEvents: 'none',
            zIndex: 'var(--z-index-slide-panel)',
          }}
        >
          {/* Backdrop */}
          {isSlidePanel(activeDialog) && (
            <div
              class="backdrop"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.3)',
                pointerEvents: 'auto',
                zIndex: 40,
              }}
              onClick={() => app.closeDialog()}
            />
          )}

          {/* Panel */}
          <div
            class="slide-panel"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: activeDialog === 'dedupe' ? '800px' : '600px',
              background: 'white',
              display: 'flex',
              flexDirection: 'column',
              transform: isSlidePanel(activeDialog) ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s ease',
              pointerEvents: 'auto',
              zIndex: 50,
              boxShadow: '4px 0 16px rgba(0,0,0,0.1)',
            }}
          >
            <div
              class="slide-panel__header"
              style={{
                padding: '16px',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{dialogTitle}</h3>
              <button
                onClick={() => app.closeDialog()}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div
              class="slide-panel__content"
              style={{ flex: 1, overflowY: 'auto', padding: '16px' }}
            >
              <div
                class="slide-panel__content"
                style={{ flex: 1, overflowY: 'auto', padding: '16px' }}
              >
                <div style={{ display: activeDialog === 'filter' ? 'block' : 'none' }}>
                  <LegacyContainer id="filter-modal-container" />
                </div>
                <div style={{ display: activeDialog === 'derive' ? 'block' : 'none' }}>
                  <LegacyContainer id="derive-modal-container" />
                </div>
                <div style={{ display: activeDialog === 'regexpMatch' ? 'block' : 'none' }}>
                  <LegacyContainer id="regexp-match-modal-container" />
                </div>
                <div style={{ display: activeDialog === 'regexpExtract' ? 'block' : 'none' }}>
                  <LegacyContainer id="regexp-extract-modal-container" />
                </div>
                <div style={{ display: activeDialog === 'date' ? 'block' : 'none' }}>
                  <LegacyContainer id="date-modal-container" />
                </div>
                <div style={{ display: activeDialog === 'dedupe' ? 'block' : 'none' }}>
                  <LegacyContainer id="dedupe-modal-container" />
                </div>
                <div style={{ display: activeDialog === 'sort' ? 'block' : 'none' }}>
                  <LegacyContainer id="sort-modal-container" />
                </div>
                <div style={{ display: activeDialog === 'sliceRows' ? 'block' : 'none' }}>
                  <LegacyContainer id="slice-rows-modal-container" />
                </div>
                <div style={{ display: activeDialog === 'index' ? 'block' : 'none' }}>
                  <LegacyContainer id="index-modal-container" />
                </div>
                <div style={{ display: activeDialog === 'fold' ? 'block' : 'none' }}>
                  <LegacyContainer id="unpivot-modal-container" />
                </div>
                <div style={{ display: activeDialog === 'pivot' ? 'block' : 'none' }}>
                  <LegacyContainer id="pivot-modal-container" />
                </div>
                <div style={{ display: activeDialog === 'replace' ? 'block' : 'none' }}>
                  <LegacyContainer id="replace-modal-container" />
                </div>
                <div style={{ display: activeDialog === 'split' ? 'block' : 'none' }}>
                  <LegacyContainer id="split-modal-container" />
                </div>
                <div style={{ display: activeDialog === 'join' ? 'block' : 'none' }}>
                  <LegacyContainer id="join-modal-container" />
                </div>
                <div style={{ display: activeDialog === 'aggregate' ? 'block' : 'none' }}>
                  <LegacyContainer id="aggregate-modal-container" />
                </div>
                <div style={{ display: activeDialog === 'column-editor' ? 'block' : 'none' }}>
                  <LegacyContainer id="column-editor-modal-container" />
                </div>
              </div>
            </div>

            <div
              class="slide-panel__footer"
              style={{
                padding: '16px',
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
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

          {/* Preview Panel */}
          {hasPreview && isSlidePanel(activeDialog) && (
            <div
              class="preview-panel"
              style={{
                position: 'absolute',
                top: '16px',
                left: activeDialog === 'dedupe' ? '816px' : '616px',
                width: '400px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 32px)',
                zIndex: 45,
              }}
            >
              <div
                class="preview-panel__header"
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e0e0e0',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <h4 style={{ margin: 0 }}>{previewTitle || 'Preview'}</h4>
                <div dangerouslySetInnerHTML={{ __html: previewStats }}></div>
              </div>
              <div class="preview-panel__content" style={{ overflow: 'auto' }}>
                <table class="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      {getPreviewColumns.call(app).map((col: string) => (
                        <th
                          key={col}
                          class={isNewPreviewColumn.call(app, col) ? 'preview-new-col' : ''}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getPreviewRows.call(app).map((row: any, i: number) => (
                      <tr key={i} class={row._removed ? 'row--removed' : ''}>
                        {getPreviewColumns.call(app).map((col: string) => (
                          <td
                            key={col}
                            class={isNewPreviewColumn.call(app, col) ? 'preview-new-col' : ''}
                          >
                            {formatPreviewCell.call(app, row, col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Centered Modal Shell */}
      {isCenteredModal(activeDialog) && (
        <div
          class="centered-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => app.closeDialog()}
        >
          <div
            class="centered-modal"
            style={{
              background: 'white',
              borderRadius: '8px',
              width: '600px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              class="centered-modal__header"
              style={{
                padding: '16px',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ margin: 0 }}>{dialogTitle}</h3>
              <button
                onClick={() => app.closeDialog()}
                style={{ background: 'none', border: 'none', fontSize: '20px' }}
              >
                ×
              </button>
            </div>
            <div class="centered-modal__content" style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{ display: activeDialog === 'import-csv' ? 'block' : 'none' }}>
                <LegacyContainer id="import-csv-modal-container" />
              </div>
              <div style={{ display: activeDialog === 'import-url' ? 'block' : 'none' }}>
                <LegacyContainer id="import-url-modal-container" />
              </div>
              <div style={{ display: activeDialog === 'settings' ? 'block' : 'none' }}>
                <LegacyContainer id="settings-modal-container" />
              </div>
              <div style={{ display: activeDialog === 'download' ? 'block' : 'none' }}>
                <LegacyContainer id="download-modal-container" />
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
              <div
                class="centered-modal__footer"
                style={{
                  padding: '16px',
                  borderTop: '1px solid #e0e0e0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                }}
              >
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
