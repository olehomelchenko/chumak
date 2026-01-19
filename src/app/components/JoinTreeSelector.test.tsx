import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, beforeEach } from 'vitest';
import { JoinTreeSelector } from './JoinTreeSelector';
import { AppStore } from '../stores/AppStore';

describe('JoinTreeSelector', () => {
  beforeEach(() => {
    // Reset stores
    AppStore.sources.value = [];
    AppStore.models.value = [];
  });

  it('renders empty state when no sources available', () => {
    render(<JoinTreeSelector selectedId={null} onSelect={() => {}} excludeId={null} />);

    expect(
      screen.getByText('No data sources available. Import a CSV file to get started.')
    ).toBeDefined();
  });

  it('renders sources and models in tree structure', () => {
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
    AppStore.models.value = [
      {
        id: 'm1',
        name: 'Sales',
        sourceId: 's1',
        steps: [],
        schema: [],
        data: [],
        __v: 1,
      },
    ];

    render(<JoinTreeSelector selectedId={null} onSelect={() => {}} excludeId={null} />);

    expect(screen.getByText('Customers')).toBeDefined();
    expect(screen.getByText('Sales')).toBeDefined();
  });

  it('calls onSelect when source is clicked', () => {
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

    let selectedId: string | null = null;
    const handleSelect = (id: string) => {
      selectedId = id;
    };

    render(<JoinTreeSelector selectedId={null} onSelect={handleSelect} excludeId={null} />);

    const sourceItem = screen.getByText('Customers');
    fireEvent.click(sourceItem);

    expect(selectedId).toBe('s1');
  });

  it('calls onSelect when model is clicked', () => {
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
    AppStore.models.value = [
      {
        id: 'm1',
        name: 'Sales',
        sourceId: 's1',
        steps: [],
        schema: [],
        data: [],
        __v: 1,
      },
    ];

    let selectedId: string | null = null;
    const handleSelect = (id: string) => {
      selectedId = id;
    };

    render(<JoinTreeSelector selectedId={null} onSelect={handleSelect} excludeId={null} />);

    const modelItem = screen.getByText('Sales');
    fireEvent.click(modelItem);

    expect(selectedId).toBe('m1');
  });

  it('does not call onSelect when excluded id is clicked', () => {
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

    let selectedId: string | null = null;
    const handleSelect = (id: string) => {
      selectedId = id;
    };

    render(<JoinTreeSelector selectedId={null} onSelect={handleSelect} excludeId="s1" />);

    const sourceItem = screen.getByText('Customers');
    fireEvent.click(sourceItem);

    expect(selectedId).toBeNull();
  });

  it('calls onPreview when preview button is clicked', () => {
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

    let previewedId: string | null = null;
    const handlePreview = (id: string) => {
      previewedId = id;
    };

    render(
      <JoinTreeSelector
        selectedId={null}
        onSelect={() => {}}
        excludeId={null}
        onPreview={handlePreview}
      />
    );

    // Find preview button (iconify icon with data-icon="carbon:view")
    const previewButtons = screen.getAllByTitle('Preview table');
    expect(previewButtons.length).toBeGreaterThan(0);

    fireEvent.click(previewButtons[0]);

    expect(previewedId).toBe('s1');
  });

  it('highlights selected source', () => {
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

    render(<JoinTreeSelector selectedId="s1" onSelect={() => {}} excludeId={null} />);

    const sourceItem = screen.getByText('Customers').closest('div');
    expect(sourceItem?.classList.toString()).toContain('active');
  });
});
