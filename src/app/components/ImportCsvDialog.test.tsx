import { render, screen, fireEvent } from '@testing-library/preact';
import { signal } from '@preact/signals';
import { describe, it, expect, vi } from 'vitest';
import { ImportCsvDialog } from './ImportCsvDialog';

describe('ImportCsvDialog', () => {
  const createProps = () => ({
    sourceName: signal('test_source'),
    isJson: signal(false),
    jsonPath: signal(''),
    jsonRawValuePreview: signal(''),
    suggestedJsonKeys: signal<string[]>([]),
    flattenJson: signal(false),
    serializeNested: signal(false),
    jsonData: signal<any>(null),
    delimiter: signal(','),
    headerMode: signal<'first-row' | 'auto-generate' | 'manual'>('first-row'),
    customHeaders: signal<string[]>([]),
    duplicateWarning: signal(''),
    previewHeaders: signal<string[]>(['col1', 'col2']),
    previewDataRows: signal<any[][]>([
      ['a', 'b'],
      ['c', 'd'],
    ]),
    onJsonPathUpdate: vi.fn(),
    onJsonPathReset: vi.fn(),
    onJsonPathSegmentSelect: vi.fn(),
    onParamChange: vi.fn(),
  });

  it('renders CSV mode correctly', () => {
    const props = createProps();
    render(<ImportCsvDialog {...props} />);

    expect(screen.getByText('Source Name:')).toBeDefined();
    expect(screen.getByDisplayValue('test_source')).toBeDefined();
    expect(screen.getByText('Delimiter:')).toBeDefined();
    expect(screen.getAllByRole('radio').length).toBe(6); // 3 delimiter + 3 header mode
    expect(screen.getByText('Preview (first 5 rows):')).toBeDefined();
    expect(screen.getByText('col1')).toBeDefined();
    expect(screen.getByText('a')).toBeDefined();
  });

  it('renders JSON mode correctly', () => {
    const props = createProps();
    props.isJson.value = true;
    props.jsonPath.value = 'data.items';
    props.suggestedJsonKeys.value = ['key1'];
    props.jsonData.value = [{}]; // Valid data

    render(<ImportCsvDialog {...props} />);

    expect(screen.getByText('Data Path (dot notation):')).toBeDefined();
    expect(screen.getByDisplayValue('data.items')).toBeDefined();
    expect(screen.getByText('key1')).toBeDefined();
    expect(screen.queryByText('Delimiter:')).toBeNull();
  });

  it('handles interaction in CSV mode', () => {
    const props = createProps();
    render(<ImportCsvDialog {...props} />);

    // Change delimiter
    fireEvent.click(screen.getByLabelText('Tab'));
    expect(props.delimiter.value).toBe('\t');
    expect(props.onParamChange).toHaveBeenCalled();

    // Change header mode
    fireEvent.click(screen.getByLabelText('Specify manually'));
    expect(props.headerMode.value).toBe('manual');
    expect(props.onParamChange).toHaveBeenCalled();
  });

  it('handles manual headers input', () => {
    const props = createProps();
    props.headerMode.value = 'manual';
    props.customHeaders.value = ['Header1', 'Header2'];
    render(<ImportCsvDialog {...props} />);

    const inputs = screen.getAllByPlaceholderText(/Column \d+/);
    expect(inputs.length).toBe(2);

    fireEvent.input(inputs[0], { target: { value: 'NewHeader1' } });
    expect(props.customHeaders.value[0]).toBe('NewHeader1');
    expect(props.onParamChange).toHaveBeenCalled();
  });

  it('handles JSON path updates', async () => {
    const props = createProps();
    props.isJson.value = true;
    render(<ImportCsvDialog {...props} />);

    const pathInput = screen.getByPlaceholderText('e.g., results or data.items');
    fireEvent.input(pathInput, { target: { value: 'new.path' } });
    expect(props.jsonPath.value).toBe('new.path');
    expect(props.onJsonPathUpdate).toHaveBeenCalledWith('new.path');

    // Reset button
    props.jsonPath.value = 'something';
    // Signals trigger update, no need to re-render
    fireEvent.click(screen.getByText('Reset'));
    expect(props.onJsonPathReset).toHaveBeenCalled();

    // Segment select
    props.suggestedJsonKeys.value = ['segment'];
    // Need to wait for Preact to update DOM? Preact signals are usually synchronous or microtask.
    // Testing library usually waits. But if 'segment' was not there, we might need waitFor.
    // However, signals + Preact usually works fine.
    // If suggestedJsonKeys is used in map:
    // {suggestedJsonKeys.value.map(...)}
    // It should update.

    // Let's use findByText to be safe/async if needed, or just getByText if sync.
    // But importantly, do NOT call render() again.

    // Actually, for the list to update, Preact needs to re-render the component or the list part.
    // Signal change triggers it.

    // The previous error was caused by multiple renders appending to body.

    await screen.findByText('segment');
    fireEvent.click(screen.getByText('segment'));
    expect(props.onJsonPathSegmentSelect).toHaveBeenCalledWith('segment');
  });
});
