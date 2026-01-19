import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, beforeEach } from 'vitest';
import { TablePreviewModal } from './TablePreviewModal';
import { DialogStore } from '../stores/DialogStore';
import { AppStore } from '../stores/AppStore';

describe('TablePreviewModal', () => {
  beforeEach(() => {
    // Reset stores
    DialogStore.joinState.previewTableId.value = null;
    DialogStore.joinState.previewMismatchValues.value = null;
    AppStore.models.value = [];
    AppStore.sources.value = [];
  });

  it('returns null when no preview is requested', () => {
    const { container } = render(<TablePreviewModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders table preview for a source', () => {
    AppStore.sources.value = [
      {
        id: 's1',
        name: 'Customers',
        data: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        columns: [
          { name: 'id', type: 'integer' },
          { name: 'name', type: 'string' },
        ],
        fileName: 'customers.csv',
        delimiter: ',',
        headerMode: 'first-row',
        customHeaders: null,
        origin: 'file',
      },
    ];

    DialogStore.joinState.previewTableId.value = 's1';

    render(<TablePreviewModal />);

    expect(screen.getByText('Customers')).toBeDefined();
    expect(screen.getByText('2 rows, 2 columns')).toBeDefined();
    expect(screen.getByText('id')).toBeDefined();
    expect(screen.getByText('name')).toBeDefined();
  });

  it('renders table preview for a model', () => {
    AppStore.models.value = [
      {
        id: 'm1',
        name: 'Sales',
        sourceId: 's1',
        steps: [],
        schema: [{ name: 'amount', type: 'float' }],
        data: [{ amount: 100 }, { amount: 200 }],
        __v: 1,
      },
    ];

    DialogStore.joinState.previewTableId.value = 'm1';

    render(<TablePreviewModal />);

    expect(screen.getByText('Sales')).toBeDefined();
    expect(screen.getByText('2 rows, 1 columns')).toBeDefined();
    expect(screen.getByText('amount')).toBeDefined();
  });

  it('closes when close button is clicked', () => {
    AppStore.sources.value = [
      {
        id: 's1',
        name: 'Customers',
        data: [],
        columns: [],
        fileName: 'customers.csv',
        delimiter: ',',
        headerMode: 'first-row',
        customHeaders: null,
        origin: 'file',
      },
    ];

    DialogStore.joinState.previewTableId.value = 's1';

    render(<TablePreviewModal />);

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(DialogStore.joinState.previewTableId.value).toBeNull();
  });

  it('closes when backdrop is clicked', () => {
    AppStore.sources.value = [
      {
        id: 's1',
        name: 'Customers',
        data: [],
        columns: [],
        fileName: 'customers.csv',
        delimiter: ',',
        headerMode: 'first-row',
        customHeaders: null,
        origin: 'file',
      },
    ];

    DialogStore.joinState.previewTableId.value = 's1';

    const { container } = render(<TablePreviewModal />);

    // Find backdrop (the div with backdrop class)
    const backdrop = container.querySelector('[class*="backdrop"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(DialogStore.joinState.previewTableId.value).toBeNull();
    } else {
      // If backdrop not found by class, try finding by role or structure
      const modalContent = screen.getByText('Customers');
      const backdropDiv = modalContent.closest('div')?.parentElement?.parentElement;
      if (backdropDiv) {
        fireEvent.click(backdropDiv);
        expect(DialogStore.joinState.previewTableId.value).toBeNull();
      }
    }
  });

  it('renders mismatch values preview', () => {
    DialogStore.joinState.previewMismatchValues.value = {
      values: ['value1', 'value2', 'value3'],
      column: 'id',
      side: 'left',
    };

    render(<TablePreviewModal />);

    expect(screen.getByText('Left only values (id)')).toBeDefined();
    expect(screen.getByText('3 unique values')).toBeDefined();
    expect(screen.getByText('id')).toBeDefined();
    expect(screen.getByText('value1')).toBeDefined();
    expect(screen.getByText('value2')).toBeDefined();
    expect(screen.getByText('value3')).toBeDefined();
  });

  it('closes mismatch values preview when close button is clicked', () => {
    DialogStore.joinState.previewMismatchValues.value = {
      values: ['value1'],
      column: 'id',
      side: 'left',
    };

    render(<TablePreviewModal />);

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(DialogStore.joinState.previewMismatchValues.value).toBeNull();
  });

  it('shows footer note when more than 100 rows', () => {
    const largeData = Array.from({ length: 150 }, (_, i) => ({
      id: i,
      name: `Name ${i}`,
    }));

    AppStore.sources.value = [
      {
        id: 's1',
        name: 'Large Dataset',
        data: largeData,
        columns: [
          { name: 'id', type: 'integer' },
          { name: 'name', type: 'string' },
        ],
        fileName: 'large.csv',
        delimiter: ',',
        headerMode: 'first-row',
        customHeaders: null,
        origin: 'file',
      },
    ];

    DialogStore.joinState.previewTableId.value = 's1';

    render(<TablePreviewModal />);

    expect(screen.getByText('Showing first 100 of 150 rows')).toBeDefined();
  });
});
