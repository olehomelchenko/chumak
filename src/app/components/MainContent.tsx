// Note: 'h' import not needed - Vite's JSX transform handles it
import { AppStore } from '../stores/AppStore';
import { EmptyState, EmptyStateProps } from './EmptyState';
import { DatasetInfoView, DatasetInfoViewProps } from './DatasetInfoView';
import { ModelInfoView, ModelInfoViewProps } from './ModelInfoView';
import { PaginationBar, PaginationBarProps } from './PaginationBar';
import { DataTable, DataTableProps } from './DataTable';

export interface MainContentProps
  extends
    EmptyStateProps,
    DatasetInfoViewProps,
    ModelInfoViewProps,
    PaginationBarProps,
    DataTableProps {}

export function MainContent(props: MainContentProps) {
  const viewMode = AppStore.viewMode;

  return (
    <>
      {viewMode.value === 'empty' && (
        <EmptyState
          onUploadClick={props.onUploadClick}
          onPasteClick={props.onPasteClick}
          onUrlClick={props.onUrlClick}
          onFileDrop={props.onFileDrop}
          onLoadExample={props.onLoadExample}
        />
      )}

      {viewMode.value === 'dataset-info' && (
        <DatasetInfoView
          onRenameSource={props.onRenameSource}
          onDeleteSource={props.onDeleteSource}
          onSwitchToModel={props.onSwitchToModel}
          onCreateNewModel={props.onCreateNewModel}
          onReplaceSource={props.onReplaceSource}
          onRestoreBackup={props.onRestoreBackup}
        />
      )}

      {viewMode.value === 'model-info' && (
        <ModelInfoView onRenameModel={props.onRenameModel} onDeleteModel={props.onDeleteModel} />
      )}

      {viewMode.value === 'model' && (
        <>
          <PaginationBar
            onModelInfo={props.onModelInfo}
            onRenameModel={props.onRenameModel}
            onCopyModel={props.onCopyModel}
            onCreateNewModelFromActive={props.onCreateNewModelFromActive}
            onDeleteModel={props.onDeleteModel}
            onOpenDialog={props.onOpenDialog}
            onCopyCSV={props.onCopyCSV}
            onCopyJSON={props.onCopyJSON}
            onFirstPage={props.onFirstPage}
            onPrevPage={props.onPrevPage}
            onNextPage={props.onNextPage}
            onLastPage={props.onLastPage}
            onPageSizeChange={props.onPageSizeChange}
            getPaginationInfo={props.getPaginationInfo}
          />
          <DataTable
            getPaginatedData={props.getPaginatedData}
            getColumnType={props.getColumnType}
            getTypeIcon={props.getTypeIcon}
            formatCellValue={props.formatCellValue}
            formatCellValueForTooltip={props.formatCellValueForTooltip}
            onSelectColumn={props.onSelectColumn}
            onSelectCell={props.onSelectCell}
            onSelectRow={props.onSelectRow}
            onOpenTypeMenu={props.onOpenTypeMenu}
            onScroll={props.onScroll}
            onErrorCellClick={props.onErrorCellClick}
          />
        </>
      )}
    </>
  );
}
