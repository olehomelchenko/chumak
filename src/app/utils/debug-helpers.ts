/**
 * Debug helpers for development
 */

import { AppStore } from '../stores/AppStore';

/**
 * Log current page data to console for debugging
 */
export function debugLogCurrentPage() {
  const data = AppStore.currentData.value;
  const columns = AppStore.columns.value;
  const currentPage = AppStore.currentPage.value;
  const pageSize = AppStore.pageSize.value;
  const start = (currentPage - 1) * pageSize; // Page is 1-indexed
  const end = start + pageSize;
  const pageData = data ? data.slice(start, end) : [];

  console.group('🔍 Chumak Debug: Current Page Data');
  console.log('Page:', currentPage + 1);
  console.log('Page size:', pageSize);
  console.log('Total rows:', data?.length || 0);
  console.log('Columns:', columns);
  console.log('Rows in this page:', pageData.length);
  console.log('');
  console.log('Raw page data (with types):');
  console.table(
    pageData.map((row: any) => {
      const typedRow: any = {};
      columns.forEach((col: string) => {
        const value = row[col];
        typedRow[col] = value;
        typedRow[`${col} (type)`] =
          value === null || value === undefined
            ? 'null/undefined'
            : typeof value === 'object' && value !== null && value.type === 'error'
              ? 'error'
              : typeof value;
        typedRow[`${col} (formatted)`] = formatValue(value);
      });
      return typedRow;
    })
  );
  console.log('');
  console.log('Full page data objects:');
  pageData.forEach((row: any, idx: number) => {
    console.log(`Row ${start + idx}:`, row);
  });
  console.groupEnd();
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object' && value !== null && value.type === 'error') {
    return `Error: ${value.message}`;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Log all current data to console
 */
export function debugLogAllData() {
  const data = AppStore.currentData.value;
  const columns = AppStore.columns.value;
  const schema = AppStore.activeModel.value?.schema || AppStore.activeSource.value?.columns || [];

  console.group('🔍 Chumak Debug: All Data');
  console.log('Total rows:', data?.length || 0);
  console.log('Columns:', columns);
  console.log('Schema:', schema);
  console.log('');
  console.log('Sample (first 10 rows):');
  if (data && data.length > 0) {
    console.table(data.slice(0, 10));
  } else {
    console.log('No data available');
  }
  console.groupEnd();
}

/**
 * Set up debug helpers on window object for console access
 */
export function setupDebugHelpers() {
  if (typeof window !== 'undefined') {
    (window as any).chumakDebug = {
      page: debugLogCurrentPage,
      all: debugLogAllData,
      store: AppStore, // Expose AppStore for inspection
    };
    console.log(
      '%c🔍 Chumak Debug Helpers Available',
      'color: #4CAF50; font-weight: bold; font-size: 14px;'
    );
    console.log('Use in console:');
    console.log('  chumakDebug.page() - Log current page data');
    console.log('  chumakDebug.all() - Log all data');
    console.log('  chumakDebug.store - Access AppStore');
  }
}
