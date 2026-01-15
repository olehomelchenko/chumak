// Note: 'h' import not needed - Vite's JSX transform handles it
import { AppStore } from '../stores/AppStore';
import { DialogName } from '../types';

export interface PaginationBarProps {
  onRenameModel: () => void;
  onCopyModel: () => void;
  onCreateNewModelFromActive: () => void;
  onDeleteModel: () => void;
  onOpenDialog: (dialog: DialogName) => void;
  onCopyCSV: () => void;
  onCopyJSON: () => void;
  onFirstPage: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onLastPage: () => void;
  onPageSizeChange: (size: number) => void;
  getPaginationInfo: () => string;
}

export function PaginationBar({
  onRenameModel,
  onCopyModel,
  onCreateNewModelFromActive,
  onDeleteModel,
  onOpenDialog,
  onCopyCSV,
  onCopyJSON,
  onFirstPage,
  onPrevPage,
  onNextPage,
  onLastPage,
  onPageSizeChange,
  getPaginationInfo,
}: PaginationBarProps) {
  const currentPage = AppStore.currentPage;
  const totalPages = AppStore.totalPages;
  const pageSize = AppStore.pageSize;

  return (
    <div class="pagination">
      {/* Model Actions (Left) */}
      <div class="model-actions">
        <button
          class="button button--ghost button--small"
          onClick={onRenameModel}
          title="Rename model"
        >
          <span class="iconify" data-icon="carbon:edit"></span>
          <span>Rename</span>
        </button>
        <button class="button button--ghost button--small" onClick={onCopyModel} title="Copy model">
          <span class="iconify" data-icon="carbon:copy"></span>
          <span>Copy</span>
        </button>
        <button
          class="button button--ghost button--small"
          onClick={onCreateNewModelFromActive}
          title="New model from same source"
        >
          <span class="iconify" data-icon="carbon:add-filled"></span>
          <span>New</span>
        </button>
        <button
          class="button button--ghost button--small button--danger-text"
          onClick={onDeleteModel}
          title="Delete model"
        >
          <span class="iconify" data-icon="carbon:trash-can"></span>
          <span>Delete</span>
        </button>

        <div class="pagination__divider"></div>

        <button
          class="button button--ghost button--small"
          onClick={() => onOpenDialog('download')}
          title="Download options (CSV, JSON, Workflow)"
        >
          <span class="iconify" data-icon="carbon:download"></span>
        </button>

        <button
          class="copy-button"
          onClick={onCopyCSV}
          title="Copy current page to clipboard (CSV)"
        >
          <span
            class="iconify base-icon"
            data-icon="material-symbols-light:csv-outline-rounded"
          ></span>
          <span class="iconify overlay-icon" data-icon="carbon:copy"></span>
        </button>

        <button
          class="copy-button"
          onClick={onCopyJSON}
          title="Copy current page to clipboard (JSON)"
        >
          <span
            class="iconify base-icon"
            data-icon="material-symbols-light:file-json-outline-rounded"
          ></span>
          <span class="iconify overlay-icon" data-icon="carbon:copy"></span>
        </button>
      </div>

      {/* Pagination Context (Right) */}
      <div
        class="pagination__controls"
        style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
      >
        <span class="pagination__info">{getPaginationInfo()}</span>

        <div class="pagination__divider"></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button
            class="button button--secondary button--small"
            onClick={onFirstPage}
            disabled={currentPage.value === 1}
            title="First page"
          >
            «
          </button>
          <button
            class="button button--secondary button--small"
            onClick={onPrevPage}
            disabled={currentPage.value === 1}
            title="Previous page"
          >
            ‹
          </button>
          <div class="pagination__page-indicator">
            Page <span>{currentPage.value}</span> of <span>{totalPages.value}</span>
          </div>
          <button
            class="button button--secondary button--small"
            onClick={onNextPage}
            disabled={currentPage.value >= totalPages.value}
            title="Next page"
          >
            ›
          </button>
          <button
            class="button button--secondary button--small"
            onClick={onLastPage}
            disabled={currentPage.value >= totalPages.value}
            title="Last page"
          >
            »
          </button>
        </div>

        <div class="pagination__divider" style={{ marginLeft: '0.5rem' }}></div>

        <span style={{ fontSize: '0.875rem', color: 'var(--color-dark-gray)' }}>Rows:</span>
        <select
          class="form-input"
          style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
          value={pageSize.value}
          onChange={(e) => onPageSizeChange(Number((e.target as HTMLSelectElement).value))}
        >
          <option value="100">100</option>
          <option value="250">250</option>
          <option value="500">500</option>
          <option value="1000">1000</option>
          <option value="2500">2500</option>
        </select>
      </div>
    </div>
  );
}
