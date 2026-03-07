/**
 * Pagination handlers - Data table pagination management
 *
 * These functions manage pagination state for the data table.
 * They now work directly with stores instead of requiring SytoApp context.
 */

import { AppStore } from '../../stores/AppStore';
import { updateUXSetting } from '../../infrastructure/ux-settings';
import * as InteractionHandlers from './interaction-handlers';

/**
 * Update pagination state based on current data
 */
export function updatePagination(): void {
  const currentData = AppStore.currentData.value;
  const pageSize = AppStore.pageSize.value;

  if (!currentData) {
    AppStore.totalPages.value = 1;
    AppStore.currentPage.value = 1;
    return;
  }

  const totalRows = currentData.length;
  AppStore.totalPages.value = Math.max(1, Math.ceil(totalRows / pageSize));

  if (AppStore.currentPage.value > AppStore.totalPages.value) {
    AppStore.currentPage.value = 1;
  }
}

/**
 * Get the current page of data
 */
export function getPaginatedData(): any[] {
  const currentData = AppStore.currentData.value;
  const currentPage = AppStore.currentPage.value;
  const pageSize = AppStore.pageSize.value;

  if (!currentData || currentData.length === 0) return [];

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  return currentData.slice(start, end);
}

/**
 * Get human-readable pagination info string
 */
export function getPaginationInfo(): string {
  const currentData = AppStore.currentData.value;
  const currentPage = AppStore.currentPage.value;
  const pageSize = AppStore.pageSize.value;

  if (!currentData || currentData.length === 0) return 'No data';

  const totalRows = currentData.length;
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalRows);

  return `Showing ${start.toLocaleString()}-${end.toLocaleString()} of ${totalRows.toLocaleString()}`;
}

/**
 * Go to previous page
 */
export function previousPage(): void {
  if (AppStore.currentPage.value > 1) {
    AppStore.currentPage.value--;
    InteractionHandlers.clearColumnSelection();
  }
}

/**
 * Go to next page
 */
export function nextPage(): void {
  if (AppStore.currentPage.value < AppStore.totalPages.value) {
    AppStore.currentPage.value++;
    InteractionHandlers.clearColumnSelection();
  }
}

/**
 * Go to first page
 */
export function goToFirstPage(): void {
  if (AppStore.currentPage.value !== 1) {
    AppStore.currentPage.value = 1;
    InteractionHandlers.clearColumnSelection();
  }
}

/**
 * Go to last page
 */
export function goToLastPage(): void {
  if (AppStore.currentPage.value !== AppStore.totalPages.value) {
    AppStore.currentPage.value = AppStore.totalPages.value;
    InteractionHandlers.clearColumnSelection();
  }
}

/**
 * Update page size and recalculate pagination
 */
export function updatePageSize(newSize: number | string): void {
  const size = typeof newSize === 'string' ? parseInt(newSize, 10) : newSize;
  if (isNaN(size) || size < 1) return;

  AppStore.pageSize.value = size;
  InteractionHandlers.clearColumnSelection();
  updatePagination();
  updateUXSetting('pagination', 'pageSize', size);
  AppStore.currentPage.value = 1;
  updatePagination();
}
