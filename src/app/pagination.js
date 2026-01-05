/**
 * Pagination Module
 *
 * Handles data pagination and page navigation
 *
 * Dependencies:
 * - updateUXSetting from ux-settings.js
 */

/**
 * Create pagination handler methods for Alpine component
 * @returns {Object} Pagination handler methods
 */
export function createPagination() {
  return {
    /**
     * Update pagination state when data changes
     */
    updatePagination() {
      if (!this.currentData) {
        this.totalPages = 1;
        this.currentPage = 1;
        return;
      }

      const totalRows = this.currentData.length;
      this.totalPages = Math.max(1, Math.ceil(totalRows / this.pageSize));

      // Reset to page 1 if current page is out of bounds
      if (this.currentPage > this.totalPages) {
        this.currentPage = 1;
      }
    },

    /**
     * Get paginated slice of current data
     * @returns {Array} Paginated data
     */
    getPaginatedData() {
      if (!this.currentData || this.currentData.length === 0) {
        return [];
      }

      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.currentData.slice(start, end);
    },

    /**
     * Get pagination info text
     * @returns {string} Info text like "Showing 1-500 of 10,000"
     */
    getPaginationInfo() {
      if (!this.currentData || this.currentData.length === 0) {
        return 'No data';
      }

      const totalRows = this.currentData.length;
      const start = (this.currentPage - 1) * this.pageSize + 1;
      const end = Math.min(this.currentPage * this.pageSize, totalRows);

      return `Showing ${start.toLocaleString()}-${end.toLocaleString()} of ${totalRows.toLocaleString()}`;
    },

    /**
     * Navigate to previous page
     */
    previousPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.clearColumnSelection();
      }
    },

    /**
     * Navigate to next page
     */
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.clearColumnSelection();
      }
    },

    /**
     * Update page size and save to UX settings
     * @param {number} newSize - New page size
     */
    updatePageSize(newSize) {
      const size = parseInt(newSize, 10);
      if (isNaN(size) || size < 1) {
        return;
      }

      this.pageSize = size;
      this.clearColumnSelection();
      this.updatePagination();

      // Save to UX settings
      updateUXSetting('pagination', 'pageSize', size);

      // Update pagination (recalculate total pages, reset to page 1)
      this.currentPage = 1;
      this.updatePagination();

      console.log('Page size updated to:', size);
    },
  };
}
