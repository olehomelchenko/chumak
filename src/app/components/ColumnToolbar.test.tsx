/**
 * ColumnToolbar Component Tests
 *
 * Tests keyboard navigation, ARIA attributes, and auto-focus behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { ColumnToolbar } from './ColumnToolbar';
import { AppStore } from '../stores/AppStore';

describe('ColumnToolbar - keyboard navigation', () => {
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

  function getButtons() {
    return Array.from(document.querySelectorAll<HTMLElement>('button'));
  }

  it('should not render when no column is selected', () => {
    render(<ColumnToolbar {...mockProps} />);
    expect(document.querySelector('[role="toolbar"]')).toBeNull();
  });

  it('should render with toolbar role and label when column is selected', () => {
    AppStore.selectedColumn.value = 'name';
    render(<ColumnToolbar {...mockProps} />);

    const toolbar = document.querySelector('[role="toolbar"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar!.getAttribute('aria-label')).toBe('Column actions');
  });

  it('should render all action buttons for a string column', () => {
    AppStore.selectedColumn.value = 'name';
    render(<ColumnToolbar {...mockProps} />);

    const buttons = getButtons();
    // Sort asc, Sort desc, Filter, Rename, Split, Dedupe, Impute, Duplicate, Remove = 9
    expect(buttons.length).toBe(9);
  });

  it('should render date button for date columns', () => {
    AppStore.selectedColumn.value = 'created';
    render(<ColumnToolbar {...mockProps} getColumnType={() => 'date'} />);

    const buttons = getButtons();
    // Sort asc, Sort desc, Filter, Rename, Split, Date, Dedupe, Impute, Duplicate, Remove = 10
    expect(buttons.length).toBe(10);
  });

  it('should move focus right on ArrowRight', () => {
    AppStore.selectedColumn.value = 'name';
    render(<ColumnToolbar {...mockProps} />);
    const buttons = getButtons();

    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: 'ArrowRight' });

    expect(document.activeElement).toBe(buttons[1]);
  });

  it('should move focus left on ArrowLeft', () => {
    AppStore.selectedColumn.value = 'name';
    render(<ColumnToolbar {...mockProps} />);
    const buttons = getButtons();

    buttons[2].focus();
    fireEvent.keyDown(buttons[2], { key: 'ArrowLeft' });

    expect(document.activeElement).toBe(buttons[1]);
  });

  it('should wrap from last to first on ArrowRight', () => {
    AppStore.selectedColumn.value = 'name';
    render(<ColumnToolbar {...mockProps} />);
    const buttons = getButtons();
    const lastIdx = buttons.length - 1;

    buttons[lastIdx].focus();
    fireEvent.keyDown(buttons[lastIdx], { key: 'ArrowRight' });

    expect(document.activeElement).toBe(buttons[0]);
  });

  it('should wrap from first to last on ArrowLeft', () => {
    AppStore.selectedColumn.value = 'name';
    render(<ColumnToolbar {...mockProps} />);
    const buttons = getButtons();

    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: 'ArrowLeft' });

    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  it('should focus first button on Home', () => {
    AppStore.selectedColumn.value = 'name';
    render(<ColumnToolbar {...mockProps} />);
    const buttons = getButtons();

    buttons[3].focus();
    fireEvent.keyDown(buttons[3], { key: 'Home' });

    expect(document.activeElement).toBe(buttons[0]);
  });

  it('should focus last button on End', () => {
    AppStore.selectedColumn.value = 'name';
    render(<ColumnToolbar {...mockProps} />);
    const buttons = getButtons();

    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: 'End' });

    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  it('should call onSort asc when first button is clicked', () => {
    AppStore.selectedColumn.value = 'name';
    render(<ColumnToolbar {...mockProps} />);
    const buttons = getButtons();

    fireEvent.click(buttons[0]);
    expect(mockProps.onSort).toHaveBeenCalledWith('asc');
  });

  it('should call onRemove when last button is clicked', () => {
    AppStore.selectedColumn.value = 'name';
    render(<ColumnToolbar {...mockProps} />);
    const buttons = getButtons();

    fireEvent.click(buttons[buttons.length - 1]);
    expect(mockProps.onRemove).toHaveBeenCalled();
  });
});
