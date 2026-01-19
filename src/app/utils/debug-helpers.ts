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

  console.group('🔍 Syto Debug: Current Page Data');
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

  console.group('🔍 Syto Debug: All Data');
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
 * Check service worker status and cache information
 */
export async function debugLogServiceWorkerStatus() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('Service Workers are not supported in this browser');
    return;
  }

  console.group('🔍 Syto Debug: Service Worker Status');

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('Registered service workers:', registrations.length);

    if (registrations.length === 0) {
      console.warn('⚠️ No service worker registered!');
      console.log('Make sure:');
      console.log('1. You are using a production build (npm run preview, not npm run dev)');
      console.log('2. You have visited the page with internet connection first');
    } else {
      registrations.forEach((registration, idx) => {
        console.log(`Service Worker ${idx + 1}:`);
        console.log('  URL:', registration.scope);
        console.log('  State:', registration.active?.state || 'Not active');
        console.log('  Installing:', registration.installing?.state || 'None');
        console.log('  Waiting:', registration.waiting?.state || 'None');
      });
    }

    // Check caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('');
      console.log('Cache Storage:', cacheNames.length, 'cache(s)');
      if (cacheNames.length === 0) {
        console.warn('⚠️ No caches found!');
        console.log('Visit the page with internet first to populate caches.');
      } else {
        // Use Promise.all to properly await all cache inspections
        await Promise.all(
          cacheNames.map(async (cacheName) => {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            console.log(`  ${cacheName}: ${keys.length} entries`);
          })
        );
      }
    }
  } catch (error) {
    console.error('Error checking service worker status:', error);
  }

  console.log('');
  console.log('Current online status:', navigator.onLine ? '✅ Online' : '❌ Offline');
  console.groupEnd();
}

/**
 * Set up debug helpers on window object for console access
 */
export function setupDebugHelpers() {
  if (typeof window !== 'undefined') {
    (window as any).sytoDebug = {
      page: debugLogCurrentPage,
      all: debugLogAllData,
      sw: debugLogServiceWorkerStatus,
      store: AppStore, // Expose AppStore for inspection
    };
    console.log(
      '%c🔍 Syto Debug Helpers Available',
      'color: #4CAF50; font-weight: bold; font-size: 14px;'
    );
    console.log('Use in console:');
    console.log('  sytoDebug.page() - Log current page data');
    console.log('  sytoDebug.all() - Log all data');
    console.log('  sytoDebug.sw() - Check service worker status');
    console.log('  sytoDebug.store - Access AppStore');
  }
}
