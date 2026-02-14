import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppStore } from '../../stores/AppStore';
import { resetStores, setTestData, TestData } from '../test-utils';

vi.mock('../../../core/ux-settings', () => ({
  updateUXSetting: vi.fn(),
}));

vi.mock('./interaction-handlers', () => ({
  clearColumnSelection: vi.fn(),
}));

import * as PaginationHandlers from './pagination-handlers';
import * as InteractionHandlers from './interaction-handlers';

describe('pagination-handlers', () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  describe('updatePagination', () => {
    it('sets totalPages to 1 and page to 1 when no data', () => {
      AppStore.currentData.value = null;

      PaginationHandlers.updatePagination();

      expect(AppStore.totalPages.value).toBe(1);
      expect(AppStore.currentPage.value).toBe(1);
    });

    it('calculates totalPages for data fitting in one page', () => {
      setTestData(TestData.simple); // 3 rows
      AppStore.pageSize.value = 500;

      PaginationHandlers.updatePagination();

      expect(AppStore.totalPages.value).toBe(1);
    });

    it('calculates totalPages for data spanning multiple pages', () => {
      setTestData(TestData.large(1500));
      AppStore.pageSize.value = 500;

      PaginationHandlers.updatePagination();

      expect(AppStore.totalPages.value).toBe(3);
    });

    it('rounds up partial pages', () => {
      setTestData(TestData.large(501));
      AppStore.pageSize.value = 500;

      PaginationHandlers.updatePagination();

      expect(AppStore.totalPages.value).toBe(2);
    });

    it('clamps currentPage to 1 when it exceeds totalPages', () => {
      setTestData(TestData.simple); // 3 rows, 1 page
      AppStore.pageSize.value = 500;
      AppStore.currentPage.value = 5;

      PaginationHandlers.updatePagination();

      expect(AppStore.currentPage.value).toBe(1);
    });

    it('keeps currentPage when within range', () => {
      setTestData(TestData.large(1500));
      AppStore.pageSize.value = 500;
      AppStore.currentPage.value = 2;

      PaginationHandlers.updatePagination();

      expect(AppStore.currentPage.value).toBe(2);
    });
  });

  describe('getPaginatedData', () => {
    it('returns empty array when no data', () => {
      AppStore.currentData.value = null;
      expect(PaginationHandlers.getPaginatedData()).toEqual([]);
    });

    it('returns empty array for empty data', () => {
      AppStore.currentData.value = [];
      expect(PaginationHandlers.getPaginatedData()).toEqual([]);
    });

    it('returns first page slice', () => {
      setTestData(TestData.large(10));
      AppStore.pageSize.value = 3;
      AppStore.currentPage.value = 1;

      const result = PaginationHandlers.getPaginatedData();

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(1);
      expect(result[2].id).toBe(3);
    });

    it('returns second page slice', () => {
      setTestData(TestData.large(10));
      AppStore.pageSize.value = 3;
      AppStore.currentPage.value = 2;

      const result = PaginationHandlers.getPaginatedData();

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(4);
      expect(result[2].id).toBe(6);
    });

    it('returns partial last page', () => {
      setTestData(TestData.large(10));
      AppStore.pageSize.value = 3;
      AppStore.currentPage.value = 4;

      const result = PaginationHandlers.getPaginatedData();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(10);
    });
  });

  describe('getPaginationInfo', () => {
    it('returns "No data" when no data', () => {
      AppStore.currentData.value = null;
      expect(PaginationHandlers.getPaginationInfo()).toBe('No data');
    });

    it('returns "No data" for empty data', () => {
      AppStore.currentData.value = [];
      expect(PaginationHandlers.getPaginationInfo()).toBe('No data');
    });

    it('returns correct range for first page', () => {
      setTestData(TestData.large(100));
      AppStore.pageSize.value = 30;
      AppStore.currentPage.value = 1;

      expect(PaginationHandlers.getPaginationInfo()).toBe('Showing 1-30 of 100');
    });

    it('returns correct range for last partial page', () => {
      setTestData(TestData.large(100));
      AppStore.pageSize.value = 30;
      AppStore.currentPage.value = 4;

      expect(PaginationHandlers.getPaginationInfo()).toBe('Showing 91-100 of 100');
    });
  });

  describe('previousPage', () => {
    it('decrements currentPage', () => {
      AppStore.currentPage.value = 3;

      PaginationHandlers.previousPage();

      expect(AppStore.currentPage.value).toBe(2);
      expect(InteractionHandlers.clearColumnSelection).toHaveBeenCalled();
    });

    it('does nothing on page 1', () => {
      AppStore.currentPage.value = 1;

      PaginationHandlers.previousPage();

      expect(AppStore.currentPage.value).toBe(1);
      expect(InteractionHandlers.clearColumnSelection).not.toHaveBeenCalled();
    });
  });

  describe('nextPage', () => {
    it('increments currentPage', () => {
      AppStore.currentPage.value = 1;
      AppStore.totalPages.value = 3;

      PaginationHandlers.nextPage();

      expect(AppStore.currentPage.value).toBe(2);
      expect(InteractionHandlers.clearColumnSelection).toHaveBeenCalled();
    });

    it('does nothing on last page', () => {
      AppStore.currentPage.value = 3;
      AppStore.totalPages.value = 3;

      PaginationHandlers.nextPage();

      expect(AppStore.currentPage.value).toBe(3);
      expect(InteractionHandlers.clearColumnSelection).not.toHaveBeenCalled();
    });
  });

  describe('goToFirstPage', () => {
    it('jumps to page 1', () => {
      AppStore.currentPage.value = 5;

      PaginationHandlers.goToFirstPage();

      expect(AppStore.currentPage.value).toBe(1);
      expect(InteractionHandlers.clearColumnSelection).toHaveBeenCalled();
    });

    it('no-op when already on page 1', () => {
      AppStore.currentPage.value = 1;

      PaginationHandlers.goToFirstPage();

      expect(InteractionHandlers.clearColumnSelection).not.toHaveBeenCalled();
    });
  });

  describe('goToLastPage', () => {
    it('jumps to last page', () => {
      AppStore.currentPage.value = 1;
      AppStore.totalPages.value = 5;

      PaginationHandlers.goToLastPage();

      expect(AppStore.currentPage.value).toBe(5);
      expect(InteractionHandlers.clearColumnSelection).toHaveBeenCalled();
    });

    it('no-op when already on last page', () => {
      AppStore.currentPage.value = 5;
      AppStore.totalPages.value = 5;

      PaginationHandlers.goToLastPage();

      expect(InteractionHandlers.clearColumnSelection).not.toHaveBeenCalled();
    });
  });

  describe('updatePageSize', () => {
    beforeEach(() => {
      setTestData(TestData.large(100));
    });

    it('updates pageSize signal', () => {
      PaginationHandlers.updatePageSize(25);

      expect(AppStore.pageSize.value).toBe(25);
    });

    it('resets to page 1', () => {
      AppStore.currentPage.value = 3;

      PaginationHandlers.updatePageSize(25);

      expect(AppStore.currentPage.value).toBe(1);
    });

    it('accepts string input', () => {
      PaginationHandlers.updatePageSize('50');

      expect(AppStore.pageSize.value).toBe(50);
    });

    it('ignores NaN input', () => {
      AppStore.pageSize.value = 500;

      PaginationHandlers.updatePageSize('abc');

      expect(AppStore.pageSize.value).toBe(500);
    });

    it('ignores zero', () => {
      AppStore.pageSize.value = 500;

      PaginationHandlers.updatePageSize(0);

      expect(AppStore.pageSize.value).toBe(500);
    });

    it('ignores negative numbers', () => {
      AppStore.pageSize.value = 500;

      PaginationHandlers.updatePageSize(-10);

      expect(AppStore.pageSize.value).toBe(500);
    });

    it('recalculates pagination', () => {
      PaginationHandlers.updatePageSize(10);

      expect(AppStore.totalPages.value).toBe(10);
    });
  });
});
