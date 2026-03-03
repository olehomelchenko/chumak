import { useTranslation } from 'preact-i18next';
import { AppStore } from '../stores/AppStore';
import { DialogName } from '../types';
import styles from './PaginationBar.module.css';

export interface PaginationBarProps {
  onModelInfo: () => void;
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
  onModelInfo,
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
  const { t } = useTranslation('ui');
  const currentPage = AppStore.currentPage;
  const totalPages = AppStore.totalPages;
  const pageSize = AppStore.pageSize;

  return (
    <div class={styles.pagination}>
      {/* Model Actions (Left) */}
      <div class={styles.modelActions}>
        <button
          class="button button--ghost button--small"
          onClick={onModelInfo}
          title={t('pagination.modelInfo.title')}
        >
          <span class="iconify" data-icon="carbon:information"></span>
          <span>{t('pagination.modelInfo.button')}</span>
        </button>
        <button
          class="button button--ghost button--small"
          onClick={onRenameModel}
          title={t('pagination.rename.title')}
        >
          <span class="iconify" data-icon="carbon:edit"></span>
          <span>{t('pagination.rename.button')}</span>
        </button>
        <button
          class="button button--ghost button--small"
          onClick={onCopyModel}
          title={t('pagination.copy.title')}
        >
          <span class="iconify" data-icon="carbon:copy"></span>
          <span>{t('pagination.copy.button')}</span>
        </button>
        <button
          class="button button--ghost button--small"
          onClick={onCreateNewModelFromActive}
          title={t('pagination.new.title')}
        >
          <span class="iconify" data-icon="carbon:add-filled"></span>
          <span>{t('pagination.new.button')}</span>
        </button>
        <button
          class="button button--ghost button--small button--danger-text"
          onClick={onDeleteModel}
          title={t('pagination.delete.title')}
        >
          <span class="iconify" data-icon="carbon:trash-can"></span>
          <span>{t('pagination.delete.button')}</span>
        </button>

        <div class={styles.divider}></div>

        <button
          class="button button--ghost button--small"
          onClick={() => onOpenDialog('download')}
          title={t('pagination.download.title')}
        >
          <span class="iconify" data-icon="carbon:download"></span>
        </button>

        <button class={styles.copyButton} onClick={onCopyCSV} title={t('pagination.copyCSV.title')}>
          <span
            class={`iconify ${styles.baseIcon}`}
            data-icon="material-symbols-light:csv-outline-rounded"
          ></span>
          <span class={`iconify ${styles.overlayIcon}`} data-icon="carbon:copy"></span>
        </button>

        <button
          class={styles.copyButton}
          onClick={onCopyJSON}
          title={t('pagination.copyJSON.title')}
        >
          <span
            class={`iconify ${styles.baseIcon}`}
            data-icon="material-symbols-light:file-json-outline-rounded"
          ></span>
          <span class={`iconify ${styles.overlayIcon}`} data-icon="carbon:copy"></span>
        </button>
      </div>

      {/* Pagination Context (Right) */}
      <div class={styles.controls}>
        <span class={styles.paginationInfo}>{getPaginationInfo()}</span>

        <div class={styles.divider}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button
            class="button button--secondary button--small"
            onClick={onFirstPage}
            disabled={currentPage.value === 1}
            title={t('pagination.firstPage')}
          >
            «
          </button>
          <button
            class="button button--secondary button--small"
            onClick={onPrevPage}
            disabled={currentPage.value === 1}
            title={t('pagination.prevPage')}
          >
            ‹
          </button>
          <div
            class={styles.pageIndicator}
            dangerouslySetInnerHTML={{
              __html: t('pagination.pageIndicator', {
                currentPage: currentPage.value,
                totalPages: totalPages.value,
              }),
            }}
          />
          <button
            class="button button--secondary button--small"
            onClick={onNextPage}
            disabled={currentPage.value >= totalPages.value}
            title={t('pagination.nextPage')}
          >
            ›
          </button>
          <button
            class="button button--secondary button--small"
            onClick={onLastPage}
            disabled={currentPage.value >= totalPages.value}
            title={t('pagination.lastPage')}
          >
            »
          </button>
        </div>

        <div class={styles.divider}></div>

        <span class={styles.rowsLabel}>{t('pagination.rowsLabel')}</span>
        <select
          class={styles.pageSizeSelect}
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
