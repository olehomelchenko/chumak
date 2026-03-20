/**
 * ColumnToolbar Component Tests
 *
 * Tests column context menu (dropdown), multi-column toolbar,
 * keyboard navigation, and ARIA attributes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { ColumnToolbar } from './ColumnToolbar';
import { AppStore } from '../stores/AppStore';

describe('ColumnToolbar', () => {
  const mockProps = {
    onSort: vi.fn(),
    onFilter: vi.fn(),
    onRename: vi.fn(),
    onSplit: vi.fn(),
    onDate: vi.fn(),
    onDedupe: vi.fn(),
    onImpute: vi.fn(),
    onDuplicate: vi.fn(),
    onRemove: vi.fn(),
    onRemoveMultiple: vi.fn(),
    getColumnType: () => 'string',
  };

  beforeEach(() => {
    AppStore.reset();
    Object.values(mockProps).forEach((fn) => {
      if (typeof fn === 'function' && 'mockClear' in fn) fn.mockClear();
    });
  });

  function getMenuItems() {
    const menu = document.querySelector('[role="menu"]');
    return menu ? Array.from(menu.querySelectorAll<HTMLElement>('button[role="menuitem"]')) : [];
  }

  function getToolbarButtons() {
    const toolbar = document.querySelector('[role="toolbar"]');
    return toolbar ? Array.from(toolbar.querySelectorAll<HTMLElement>('button')) : [];
  }

  describe('column context menu', () => {
    it('should not render menu when columnMenuOpen is null', () => {
      render(<ColumnToolbar {...mockProps} />);
      expect(document.querySelector('[role="menu"]')).toBeNull();
    });

    it('should render menu when columnMenuOpen has a column name', () => {
      AppStore.columnMenuOpen.value = 'name';
      render(<ColumnToolbar {...mockProps} />);

      const menu = document.querySelector('[role="menu"]');
      expect(menu).not.toBeNull();
      expect(menu!.getAttribute('aria-label')).toBe('Column actions');
    });

    it('should render all menu items for a string column', () => {
      AppStore.columnMenuOpen.value = 'name';
      render(<ColumnToolbar {...mockProps} />);

      const items = getMenuItems();
      // Sort asc, Sort desc, Filter, Rename, Split, Duplicate, Dedupe, Impute, Remove = 9
      expect(items.length).toBe(9);
    });

    it('should include Date Operations for date columns', () => {
      AppStore.columnMenuOpen.value = 'created';
      render(<ColumnToolbar {...mockProps} getColumnType={() => 'date'} />);

      const items = getMenuItems();
      // Sort asc, Sort desc, Filter, Rename, Split, Duplicate, Date, Dedupe, Impute, Remove = 10
      expect(items.length).toBe(10);
    });

    it('should call onSort asc when sort ascending is clicked', () => {
      AppStore.columnMenuOpen.value = 'name';
      render(<ColumnToolbar {...mockProps} />);

      const items = getMenuItems();
      fireEvent.click(items[0]);
      expect(mockProps.onSort).toHaveBeenCalledWith('asc');
    });

    it('should call onRemove when remove is clicked', () => {
      AppStore.columnMenuOpen.value = 'name';
      render(<ColumnToolbar {...mockProps} />);

      const items = getMenuItems();
      fireEvent.click(items[items.length - 1]); // Remove is last
      expect(mockProps.onRemove).toHaveBeenCalled();
    });

    it('should close menu after action is clicked', () => {
      AppStore.columnMenuOpen.value = 'name';
      render(<ColumnToolbar {...mockProps} />);

      const items = getMenuItems();
      fireEvent.click(items[0]); // Sort asc

      expect(AppStore.columnMenuOpen.value).toBeNull();
    });

    it('should navigate menu items with ArrowDown/ArrowUp', () => {
      AppStore.columnMenuOpen.value = 'name';
      render(<ColumnToolbar {...mockProps} />);

      const items = getMenuItems();
      items[0].focus();

      fireEvent.keyDown(items[0], { key: 'ArrowDown' });
      expect(document.activeElement).toBe(items[1]);

      fireEvent.keyDown(items[1], { key: 'ArrowUp' });
      expect(document.activeElement).toBe(items[0]);
    });

    it('should wrap navigation at boundaries', () => {
      AppStore.columnMenuOpen.value = 'name';
      render(<ColumnToolbar {...mockProps} />);

      const items = getMenuItems();
      items[items.length - 1].focus();

      fireEvent.keyDown(items[items.length - 1], { key: 'ArrowDown' });
      expect(document.activeElement).toBe(items[0]);
    });

    it('should close menu on Escape', () => {
      AppStore.columnMenuOpen.value = 'name';
      render(<ColumnToolbar {...mockProps} />);

      const items = getMenuItems();
      fireEvent.keyDown(items[0], { key: 'Escape' });

      expect(AppStore.columnMenuOpen.value).toBeNull();
    });

    it('should focus first item on Home and last on End', () => {
      AppStore.columnMenuOpen.value = 'name';
      render(<ColumnToolbar {...mockProps} />);

      const items = getMenuItems();
      items[3].focus();

      fireEvent.keyDown(items[3], { key: 'Home' });
      expect(document.activeElement).toBe(items[0]);

      fireEvent.keyDown(items[0], { key: 'End' });
      expect(document.activeElement).toBe(items[items.length - 1]);
    });
  });

  describe('multi-column toolbar', () => {
    it('should render floating toolbar when multiple columns are selected', () => {
      AppStore.selectedColumns.value = ['name', 'email'];
      render(<ColumnToolbar {...mockProps} />);

      const toolbar = document.querySelector('[role="toolbar"]');
      expect(toolbar).not.toBeNull();
      expect(toolbar!.getAttribute('aria-label')).toBe('Multi-column actions');
    });

    it('should show column count and remove button', () => {
      AppStore.selectedColumns.value = ['name', 'email', 'id'];
      render(<ColumnToolbar {...mockProps} />);

      const buttons = getToolbarButtons();
      expect(buttons.length).toBe(1); // Just the remove button

      fireEvent.click(buttons[0]);
      expect(mockProps.onRemoveMultiple).toHaveBeenCalled();
    });
  });
});
