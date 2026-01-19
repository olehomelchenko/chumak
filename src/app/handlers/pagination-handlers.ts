import type { SytoApp } from '../../syto-app';
import { updateUXSetting } from '../../core/ux-settings';

export function updatePagination(this: SytoApp) {
  if (!this.currentData) {
    this.totalPages = 1;
    this.currentPage = 1;
    return;
  }
  const totalRows = this.currentData.length;
  this.totalPages = Math.max(1, Math.ceil(totalRows / this.pageSize));
  if (this.currentPage > this.totalPages) {
    this.currentPage = 1;
  }
}

export function getPaginatedData(this: SytoApp): any[] {
  if (!this.currentData || this.currentData.length === 0) return [];
  const start = (this.currentPage - 1) * this.pageSize;
  const end = start + this.pageSize;
  return this.currentData.slice(start, end);
}

export function getPaginationInfo(this: SytoApp): string {
  if (!this.currentData || this.currentData.length === 0) return 'No data';
  const totalRows = this.currentData.length;
  const start = (this.currentPage - 1) * this.pageSize + 1;
  const end = Math.min(this.currentPage * this.pageSize, totalRows);
  return `Showing ${start.toLocaleString()}-${end.toLocaleString()} of ${totalRows.toLocaleString()}`;
}

export function previousPage(this: SytoApp) {
  if (this.currentPage > 1) {
    this.currentPage--;
    this.clearColumnSelection();
  }
}

export function nextPage(this: SytoApp) {
  if (this.currentPage < this.totalPages) {
    this.currentPage++;
    this.clearColumnSelection();
  }
}

export function goToFirstPage(this: SytoApp) {
  if (this.currentPage !== 1) {
    this.currentPage = 1;
    this.clearColumnSelection();
  }
}

export function goToLastPage(this: SytoApp) {
  if (this.currentPage !== this.totalPages) {
    this.currentPage = this.totalPages;
    this.clearColumnSelection();
  }
}

export function updatePageSize(this: SytoApp, newSize: number | string) {
  const size = typeof newSize === 'string' ? parseInt(newSize, 10) : newSize;
  if (isNaN(size) || size < 1) return;
  this.pageSize = size;
  this.clearColumnSelection();
  this.updatePagination();
  updateUXSetting('pagination', 'pageSize', size);
  this.currentPage = 1;
  this.updatePagination();
}
