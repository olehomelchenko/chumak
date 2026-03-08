import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportCsvDialog } from './ImportCsvDialog';
import { DialogStore } from '../stores/DialogStore';

describe('ImportCsvDialog', () => {
  beforeEach(() => {
    // Reset store state before each test
    DialogStore.importCsvState.sourceName.value = 'test_source';
    DialogStore.importCsvState.isJson.value = false;
    DialogStore.importCsvState.jsonPath.value = '';
    DialogStore.importCsvState.jsonRawValuePreview.value = '';
    DialogStore.importCsvState.suggestedJsonKeys.value = [];
    DialogStore.importCsvState.flattenJson.value = false;
    DialogStore.importCsvState.serializeNested.value = false;
    DialogStore.importCsvState.jsonData.value = null;
    DialogStore.importCsvState.delimiter.value = ',';
    DialogStore.importCsvState.headerMode.value = 'first-row';
    DialogStore.importCsvState.customHeaders.value = [];
    DialogStore.importCsvState.duplicateWarning.value = '';
    DialogStore.importCsvState.previewHeaders.value = ['col1', 'col2'];
    DialogStore.importCsvState.previewDataRows.value = [
      ['a', 'b'],
      ['c', 'd'],
    ];
  });

  it('renders CSV mode correctly', () => {
    render(<ImportCsvDialog />);

    expect(screen.getByText('Source Name:')).toBeDefined();
    expect(screen.getByDisplayValue('test_source')).toBeDefined();
    expect(screen.getByText('Delimiter:')).toBeDefined();
    expect(screen.getAllByRole('radio').length).toBe(6); // 3 delimiter + 3 header mode
    // Preview is now shown in the preview panel, not in the dialog
    expect(screen.queryByText('Preview (first 5 rows):')).toBeNull();
  });

  it('renders JSON mode correctly', () => {
    DialogStore.importCsvState.isJson.value = true;
    DialogStore.importCsvState.jsonPath.value = 'data.items';
    DialogStore.importCsvState.suggestedJsonKeys.value = [{ key: 'key1', type: 'object' }];
    DialogStore.importCsvState.jsonData.value = [{}]; // Valid data

    render(<ImportCsvDialog />);

    expect(screen.getByText('Data Path (dot notation):')).toBeDefined();
    expect(screen.getByDisplayValue('data.items')).toBeDefined();
    expect(screen.getByText('key1')).toBeDefined();
    expect(screen.queryByText('Delimiter:')).toBeNull();
  });

  it('handles interaction in CSV mode', () => {
    const onParamChange = vi.fn();
    render(<ImportCsvDialog onParamChange={onParamChange} />);

    // Change delimiter
    fireEvent.click(screen.getByLabelText('Tab'));
    expect(DialogStore.importCsvState.delimiter.value).toBe('\t');
    expect(onParamChange).toHaveBeenCalled();

    // Change header mode
    fireEvent.click(screen.getByLabelText('Specify manually'));
    expect(DialogStore.importCsvState.headerMode.value).toBe('manual');
    expect(onParamChange).toHaveBeenCalled();
  });

  it('handles manual headers input', () => {
    DialogStore.importCsvState.headerMode.value = 'manual';
    DialogStore.importCsvState.customHeaders.value = ['Header1', 'Header2'];
    const onParamChange = vi.fn();
    render(<ImportCsvDialog onParamChange={onParamChange} />);

    const inputs = screen.getAllByPlaceholderText(/Column \d+/);
    expect(inputs.length).toBe(2);

    fireEvent.input(inputs[0], { target: { value: 'NewHeader1' } });
    expect(DialogStore.importCsvState.customHeaders.value[0]).toBe('NewHeader1');
    expect(onParamChange).toHaveBeenCalled();
  });

  it('handles JSON path updates', async () => {
    DialogStore.importCsvState.isJson.value = true;
    const onJsonPathUpdate = vi.fn();
    const onJsonPathReset = vi.fn();
    const onJsonPathSegmentSelect = vi.fn();

    render(
      <ImportCsvDialog
        onJsonPathUpdate={onJsonPathUpdate}
        onJsonPathReset={onJsonPathReset}
        onJsonPathSegmentSelect={onJsonPathSegmentSelect}
      />
    );

    const pathInput = screen.getByPlaceholderText('e.g., results or data.items');
    fireEvent.input(pathInput, { target: { value: 'new.path' } });
    expect(DialogStore.importCsvState.jsonPath.value).toBe('new.path');
    expect(onJsonPathUpdate).toHaveBeenCalledWith('new.path');

    // Reset button
    DialogStore.importCsvState.jsonPath.value = 'something';
    fireEvent.click(screen.getByText('Reset'));
    expect(onJsonPathReset).toHaveBeenCalled();

    // Segment select
    DialogStore.importCsvState.suggestedJsonKeys.value = [{ key: 'segment', type: 'object' }];
    await screen.findByText('segment');
    fireEvent.click(screen.getByText('segment'));
    expect(onJsonPathSegmentSelect).toHaveBeenCalledWith('segment');
  });
});
