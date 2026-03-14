/**
 * DataTable Component Tests
 *
 * Tests keyboard navigation for column headers.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { DataTable } from './DataTable';
import { AppStore } from '../stores/AppStore';

describe('DataTable - header keyboard navigation', () => {
  const mockProps = {
    getPaginatedData: () => [
      { name: 'Alice', age: 30, city: 'Boston' },
      { name: 'Bob', age: 25, city: 'Austin' },
    ],
    getColumnType: () => 'string',
    getTypeIcon: () => 'carbon:text-font',
    formatCellValue: (v: any) => String(v ?? ''),
    formatCellValueForTooltip: (v: any) => String(v ?? ''),
    onSelectColumn: vi.fn(),
    onSelectCell: vi.fn(),
    onOpenTypeMenu: vi.fn(),
    onSelectRow: vi.fn(),
    onScroll: vi.fn(),
  };

  beforeEach(() => {
    AppStore.reset();
    AppStore.columns.value = ['name', 'age', 'city'];
    Object.values(mockProps).forEach((fn) => {
      if (typeof fn === 'function' && 'mockClear' in fn) fn.mockClear();
    });
  });

  function getHeaders() {
    return Array.from(document.querySelectorAll<HTMLElement>('th[data-col]'));
  }

  it('should make the first header tabbable when no column is selected', () => {
    render(<DataTable {...mockProps} />);
    const headers = getHeaders();

    expect(headers[0].getAttribute('tabindex')).toBe('0');
    expect(headers[1].getAttribute('tabindex')).toBe('-1');
    expect(headers[2].getAttribute('tabindex')).toBe('-1');
  });

  it('should make the selected column header tabbable', () => {
    AppStore.selectedColumn.value = 'age';
    render(<DataTable {...mockProps} />);
    const headers = getHeaders();

    expect(headers[0].getAttribute('tabindex')).toBe('-1');
    expect(headers[1].getAttribute('tabindex')).toBe('0'); // age
    expect(headers[2].getAttribute('tabindex')).toBe('-1');
  });

  it('should select column on Enter', () => {
    render(<DataTable {...mockProps} />);
    const headers = getHeaders();

    headers[0].focus();
    fireEvent.keyDown(headers[0], { key: 'Enter' });

    expect(mockProps.onSelectColumn).toHaveBeenCalledWith('name', expect.any(Object));
  });

  it('should select column on Space', () => {
    render(<DataTable {...mockProps} />);
    const headers = getHeaders();

    headers[1].focus();
    fireEvent.keyDown(headers[1], { key: ' ' });

    expect(mockProps.onSelectColumn).toHaveBeenCalledWith('age', expect.any(Object));
  });

  it('should move focus right on ArrowRight', () => {
    render(<DataTable {...mockProps} />);
    const headers = getHeaders();

    headers[0].focus();
    fireEvent.keyDown(headers[0], { key: 'ArrowRight' });

    expect(document.activeElement).toBe(headers[1]);
    expect(headers[0].getAttribute('tabindex')).toBe('-1');
    expect(headers[1].getAttribute('tabindex')).toBe('0');
  });

  it('should move focus left on ArrowLeft', () => {
    render(<DataTable {...mockProps} />);
    const headers = getHeaders();

    headers[1].focus();
    fireEvent.keyDown(headers[1], { key: 'ArrowLeft' });

    expect(document.activeElement).toBe(headers[0]);
  });

  it('should wrap from last to first on ArrowRight', () => {
    render(<DataTable {...mockProps} />);
    const headers = getHeaders();

    headers[2].focus();
    fireEvent.keyDown(headers[2], { key: 'ArrowRight' });

    expect(document.activeElement).toBe(headers[0]);
  });

  it('should wrap from first to last on ArrowLeft', () => {
    render(<DataTable {...mockProps} />);
    const headers = getHeaders();

    headers[0].focus();
    fireEvent.keyDown(headers[0], { key: 'ArrowLeft' });

    expect(document.activeElement).toBe(headers[2]);
  });

  it('should focus first header on Home', () => {
    render(<DataTable {...mockProps} />);
    const headers = getHeaders();

    headers[2].focus();
    fireEvent.keyDown(headers[2], { key: 'Home' });

    expect(document.activeElement).toBe(headers[0]);
  });

  it('should focus last header on End', () => {
    render(<DataTable {...mockProps} />);
    const headers = getHeaders();

    headers[0].focus();
    fireEvent.keyDown(headers[0], { key: 'End' });

    expect(document.activeElement).toBe(headers[2]);
  });
});

describe('DataTable - empty state', () => {
  beforeEach(() => {
    AppStore.reset();
    AppStore.columns.value = ['name', 'age', 'city'];
  });

  const baseProps = {
    getPaginatedData: () => [] as any[],
    getColumnType: () => 'string',
    getTypeIcon: () => 'carbon:text-font',
    formatCellValue: (v: any) => String(v ?? ''),
    formatCellValueForTooltip: (v: any) => String(v ?? ''),
    onSelectColumn: vi.fn(),
    onSelectCell: vi.fn(),
    onOpenTypeMenu: vi.fn(),
    onSelectRow: vi.fn(),
    onScroll: vi.fn(),
  };

  it('should render empty state message when no rows match', () => {
    render(<DataTable {...baseProps} />);

    const emptyCell = document.querySelector('[class*="emptyStateCell"]');
    expect(emptyCell).toBeDefined();
    expect(emptyCell!.textContent).toContain('No rows match the current filter');
    expect(emptyCell!.textContent).toContain('Try adjusting the expression.');
  });

  it('should not render empty state when rows exist', () => {
    const props = {
      ...baseProps,
      getPaginatedData: () => [{ name: 'Alice', age: 30, city: 'Boston' }],
    };
    render(<DataTable {...props} />);

    const emptyCell = document.querySelector('[class*="emptyStateCell"]');
    expect(emptyCell).toBeNull();
  });

  it('should not render empty state when no columns exist', () => {
    AppStore.columns.value = [];
    render(<DataTable {...baseProps} />);

    const emptyCell = document.querySelector('[class*="emptyStateCell"]');
    expect(emptyCell).toBeNull();
  });
});
