/**
 * TypeMenu Component Tests
 *
 * Tests arrow key navigation, ARIA roles, and auto-focus behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { TypeMenu } from './TypeMenu';
import { AppStore } from '../stores/AppStore';

describe('TypeMenu', () => {
  const mockOnChangeType = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnOpenTypeConversionDialog = vi.fn();

  const defaultProps = {
    onChangeType: mockOnChangeType,
    onClose: mockOnClose,
    onOpenTypeConversionDialog: mockOnOpenTypeConversionDialog,
  };

  function openMenu() {
    AppStore.typeMenuOpen.value = true;
    AppStore.typeMenuCol.value = 'name';
    AppStore.typeMenuPos.value = { x: 100, y: 200 };
  }

  beforeEach(() => {
    AppStore.reset();
    mockOnChangeType.mockClear();
    mockOnClose.mockClear();
    mockOnOpenTypeConversionDialog.mockClear();
  });

  it('should not render when closed', () => {
    AppStore.typeMenuOpen.value = false;
    const { container } = render(<TypeMenu {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render with role="menu" when open', () => {
    openMenu();
    render(<TypeMenu {...defaultProps} />);

    const menu = screen.getByRole('menu');
    expect(menu).toBeDefined();
  });

  it('should render all items with role="menuitem"', () => {
    openMenu();
    render(<TypeMenu {...defaultProps} />);

    const items = screen.getAllByRole('menuitem');
    expect(items.length).toBe(7); // string, integer, float, boolean, date, datetime, auto
  });

  it('should auto-focus the first menu item on mount', () => {
    openMenu();
    render(<TypeMenu {...defaultProps} />);

    const items = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(items[0]);
  });

  it('should move focus down on ArrowDown', () => {
    openMenu();
    render(<TypeMenu {...defaultProps} />);

    const items = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(items[0]);

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[2]);
  });

  it('should move focus up on ArrowUp', () => {
    openMenu();
    render(<TypeMenu {...defaultProps} />);

    const items = screen.getAllByRole('menuitem');

    // Move to second item first
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);

    // Arrow up back to first
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('should wrap focus from last to first on ArrowDown', () => {
    openMenu();
    render(<TypeMenu {...defaultProps} />);

    const items = screen.getAllByRole('menuitem');
    const lastItem = items[items.length - 1];

    // Focus the last item
    lastItem.focus();
    expect(document.activeElement).toBe(lastItem);

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('should wrap focus from first to last on ArrowUp', () => {
    openMenu();
    render(<TypeMenu {...defaultProps} />);

    const items = screen.getAllByRole('menuitem');

    // Already on first item from auto-focus
    expect(document.activeElement).toBe(items[0]);

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('should focus first item on Home', () => {
    openMenu();
    render(<TypeMenu {...defaultProps} />);

    const items = screen.getAllByRole('menuitem');

    // Move to middle first
    items[3].focus();

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Home' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('should focus last item on End', () => {
    openMenu();
    render(<TypeMenu {...defaultProps} />);

    const items = screen.getAllByRole('menuitem');

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'End' });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('should open type conversion dialog on item click', () => {
    openMenu();
    render(<TypeMenu {...defaultProps} />);

    const items = screen.getAllByRole('menuitem');
    fireEvent.click(items[0]); // String

    expect(mockOnOpenTypeConversionDialog).toHaveBeenCalledWith('name', 'string');
    expect(AppStore.typeMenuOpen.value).toBe(false);
  });

  it('should call onClose when overlay is clicked', () => {
    openMenu();
    const { container } = render(<TypeMenu {...defaultProps} />);

    // The overlay is the first child (before the menu)
    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
