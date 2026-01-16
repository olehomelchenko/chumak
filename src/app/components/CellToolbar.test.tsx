/**
 * CellToolbar Component Tests
 *
 * Tests the cell toolbar, including EDA stats toolbar functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { CellToolbar } from './CellToolbar';
import { AppStore } from '../stores/AppStore';

describe('CellToolbar', () => {
  const mockOnFilter = vi.fn();
  const mockOnReplace = vi.fn();

  beforeEach(() => {
    AppStore.reset();
    mockOnFilter.mockClear();
    mockOnReplace.mockClear();
  });

  it('should not render when no cell is selected', () => {
    AppStore.selectedCell.value = null;
    const { container } = render(<CellToolbar onFilter={mockOnFilter} onReplace={mockOnReplace} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render regular toolbar for non-EDA cells', () => {
    AppStore.selectedCell.value = {
      col: 'name',
      value: 'Alice',
      type: 'string',
      rowIdx: 0,
    };
    AppStore.cellToolbarPos.value = { x: 100, y: 200, arrowOffset: 0 };

    render(<CellToolbar onFilter={mockOnFilter} onReplace={mockOnReplace} />);

    // Should show exact and not buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  describe('EDA Stats Toolbar', () => {
    it('should render EDA toolbar with comparison operators only', () => {
      AppStore.selectedCell.value = {
        col: 'sales',
        value: 1000,
        type: 'number',
        isEda: true,
        edaLabel: 'Mean',
      };
      AppStore.cellToolbarPos.value = { x: 100, y: 200, arrowOffset: 0 };

      render(<CellToolbar onFilter={mockOnFilter} onReplace={mockOnReplace} />);

      // Should show comparison operators (>, >=, <, <=)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(4);

      // Check for comparison operators
      const gtButton = buttons.find((btn) => btn.getAttribute('title')?.includes('greater than'));
      const gteButton = buttons.find((btn) =>
        btn.getAttribute('title')?.includes('greater than or equal')
      );
      const ltButton = buttons.find((btn) => btn.getAttribute('title')?.includes('less than'));
      const lteButton = buttons.find((btn) =>
        btn.getAttribute('title')?.includes('less than or equal')
      );

      expect(gtButton).toBeDefined();
      expect(gteButton).toBeDefined();
      expect(ltButton).toBeDefined();
      expect(lteButton).toBeDefined();
    });

    it('should not render EDA toolbar for non-comparable types', () => {
      AppStore.selectedCell.value = {
        col: 'name',
        value: 'Alice',
        type: 'string',
        isEda: true,
        edaLabel: 'Top Value',
      };
      AppStore.cellToolbarPos.value = { x: 100, y: 200, arrowOffset: 0 };

      const { container } = render(
        <CellToolbar onFilter={mockOnFilter} onReplace={mockOnReplace} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should call onFilter with correct operator when EDA button is clicked', () => {
      AppStore.selectedCell.value = {
        col: 'sales',
        value: 1000,
        type: 'number',
        isEda: true,
        edaLabel: 'Mean',
      };
      AppStore.cellToolbarPos.value = { x: 100, y: 200, arrowOffset: 0 };

      render(<CellToolbar onFilter={mockOnFilter} onReplace={mockOnReplace} />);

      const buttons = screen.getAllByRole('button');
      const gtButton = buttons.find((btn) => btn.getAttribute('title')?.includes('greater than'));

      if (gtButton) {
        gtButton.click();
        expect(mockOnFilter).toHaveBeenCalledWith('gt');
      }
    });

    it('should not show exact/not/replace buttons for EDA stats', () => {
      AppStore.selectedCell.value = {
        col: 'sales',
        value: 1000,
        type: 'number',
        isEda: true,
        edaLabel: 'Mean',
      };
      AppStore.cellToolbarPos.value = { x: 100, y: 200, arrowOffset: 0 };

      render(<CellToolbar onFilter={mockOnFilter} onReplace={mockOnReplace} />);

      const buttons = screen.getAllByRole('button');
      // Should only have 4 comparison buttons, no exact/not/replace
      expect(buttons.length).toBe(4);

      // Verify no replace button
      const replaceButton = buttons.find((btn) => btn.getAttribute('title')?.includes('Replace'));
      expect(replaceButton).toBeUndefined();
    });
  });
});
