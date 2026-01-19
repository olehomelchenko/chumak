import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SytoApp } from './syto-app';

describe('SytoApp URL Import', () => {
  let app: SytoApp;

  beforeEach(() => {
    // Mock global fetch
    global.fetch = vi.fn();
    // Mock console.error to keep test output clean
    vi.spyOn(console, 'error').mockImplementation(() => {});

    app = new SytoApp();
    // Mock methods called by fetchAndImportFromUrl
    app.closeDialog = vi.fn();
    app.showImportDialog = vi.fn();
  });

  it('should initialize with empty URL state', () => {
    app.showImportUrlDialog();
    expect(app.activeDialog).toBe('import-url');
    expect(app.importUrlDialogState.url).toBe('');
    expect(app.importUrlDialogState.isFetching).toBe(false);
    expect(app.importUrlDialogState.error).toBeNull();
  });

  it('should show error if URL is empty', async () => {
    app.importUrlDialogState.url = '';
    await app.fetchAndImportFromUrl();
    expect(app.importUrlDialogState.error).toBe('Please enter a valid URL');
    expect(app.importUrlDialogState.isFetching).toBe(false);
  });

  it('should fetch data and call showImportDialog on success', async () => {
    const mockCsv = 'name,age\nAlice,30\nBob,25';
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockCsv),
    });

    app.importUrlDialogState.url = 'https://example.com/data.csv';
    await app.fetchAndImportFromUrl();

    expect(global.fetch).toHaveBeenCalledWith('https://example.com/data.csv');
    expect(app.importUrlDialogState.isFetching).toBe(false);
    expect(app.importUrlDialogState.error).toBeNull();

    expect(app.closeDialog).toHaveBeenCalled();
    expect(app.showImportDialog).toHaveBeenCalledWith(expect.any(File));

    const passedFile = (app.showImportDialog as any).mock.calls[0][0];
    expect(passedFile.name).toBe('data.csv');
  });

  it('should handle fetch errors', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    app.importUrlDialogState.url = 'https://example.com/missing.csv';
    await app.fetchAndImportFromUrl();

    expect(app.importUrlDialogState.error).toBe('Failed to fetch data: 404 Not Found');
    expect(app.importUrlDialogState.isFetching).toBe(false);
    expect(app.showImportDialog).not.toHaveBeenCalled();
  });

  it('should handle network errors', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network failure'));

    app.importUrlDialogState.url = 'https://example.com/error.csv';
    await app.fetchAndImportFromUrl();

    expect(app.importUrlDialogState.error).toBe('Network failure');
    expect(app.importUrlDialogState.isFetching).toBe(false);
  });

  it('should extract filename from complex URLs', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('test'),
    });

    app.importUrlDialogState.url = 'https://api.example.com/v1/export/users.CSV?token=123';
    await app.fetchAndImportFromUrl();

    const passedFile = (app.showImportDialog as any).mock.calls[0][0];
    expect(passedFile.name).toBe('users.CSV');
  });

  it('should fetch JSON data and handle it correctly', async () => {
    const mockJson = JSON.stringify([{ id: 1, name: 'Test' }]);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockJson),
    });

    app.importUrlDialogState.url = 'https://example.com/data.json';
    await app.fetchAndImportFromUrl();

    expect(app.showImportDialog).toHaveBeenCalledWith(expect.any(File));
    const passedFile = (app.showImportDialog as any).mock.calls[0][0];
    expect(passedFile.name).toBe('data.json');
    // Note: showImportDialog will internally handle the .json extension logic
  });

  it('should resolve nested JSON paths', () => {
    const nestedData = {
      meta: { count: 1 },
      results: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    };
    const file = new File([''], 'data.json');

    app.handleJsonPreview(file, nestedData, 'results');

    expect(app.importDialogState.jsonData).toHaveLength(2);
    expect(app.importDialogState.previewHeaders).toContain('name');
    expect(app.importDialogState.jsonPath).toBe('results');
  });

  it('should show top-level keys as suggestions if no path is provided', () => {
    const nestedData = {
      meta: { count: 1 },
      results: [{ id: 1, name: 'Alice' }],
    };
    const file = new File([''], 'data.json');

    app.handleJsonPreview(file, nestedData);

    // Should NOT have found 'results' automatically anymore
    expect(app.importDialogState.jsonPath).toBe('');
    expect(app.importDialogState.suggestedJsonKeys).toContain('meta');
    expect(app.importDialogState.suggestedJsonKeys).toContain('results');
  });

  it('should provide a raw value preview for JSON paths', () => {
    const data = {
      nested: {
        value: 'hello',
        items: [1, 2, 3],
      },
    };
    const file = new File([''], 'data.json');

    app.handleJsonPreview(file, data, 'nested');

    expect(app.importDialogState.jsonRawValuePreview).toContain('"value": "hello"');
    expect(app.importDialogState.jsonRawValuePreview).toContain('"items"');
  });

  it('should support interactive path navigation', () => {
    const data = {
      api: {
        v1: {
          users: [{ id: 1 }],
        },
      },
    };
    const file = new File([''], 'data.json');

    app.handleJsonPreview(file, data);

    expect(app.importDialogState.suggestedJsonKeys).toContain('api');

    app.selectJsonPathSegment('api');
    expect(app.importDialogState.jsonPath).toBe('api');
    expect(app.importDialogState.suggestedJsonKeys).toContain('v1');

    app.selectJsonPathSegment('v1');
    expect(app.importDialogState.jsonPath).toBe('api.v1');
    expect(app.importDialogState.suggestedJsonKeys).toContain('users');

    app.selectJsonPathSegment('users');
    expect(app.importDialogState.jsonPath).toBe('api.v1.users');
    expect(app.importDialogState.jsonData).toHaveLength(1);
    // When it's an array, it suggests '0' and keys of first element
    expect(app.importDialogState.suggestedJsonKeys).toContain('0');
  });

  it('should support flattening and serializing nested JSON', () => {
    const data = [
      {
        id: 1,
        user: { name: 'Alice', details: { age: 30 } },
        tags: ['a', 'b'],
      },
    ];
    const file = new File([''], 'data.json');

    app.handleJsonPreview(file, data);

    // Enable serializeNested (default is false)
    app.importDialogState.serializeNested = true;
    app.updateHeadersForPreview();
    expect(app.importDialogState.previewHeaders).toContain('user');
    expect(typeof app.importDialogState.previewDataRows[0][1]).toBe('string'); // user is stringified

    // Enable flattening
    app.importDialogState.flattenJson = true;
    app.updateHeadersForPreview();

    expect(app.importDialogState.previewHeaders).toContain('user_name');
    expect(app.importDialogState.previewHeaders).toContain('user_details_age');
    expect(app.importDialogState.previewDataRows[0][1]).toBe('Alice');

    // tags is an array, it should be stringified if serializeNested is on
    expect(typeof app.importDialogState.previewDataRows[0][3]).toBe('string');
    expect(app.importDialogState.previewDataRows[0][3]).toBe('["a","b"]');
  });
});
