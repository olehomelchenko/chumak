import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChumakApp } from './chumak-app';

describe('ChumakApp URL Import', () => {
  let app: ChumakApp;

  beforeEach(() => {
    // Mock global fetch
    global.fetch = vi.fn();
    // Mock console.error to keep test output clean
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    app = new ChumakApp();
    // Mock methods called by fetchAndImportFromUrl
    app.closeDialog = vi.fn();
    app.showImportDialog = vi.fn();
    // Mock $nextTick which is usually injected by Alpine
    app.$nextTick = vi.fn().mockImplementation((cb) => cb?.());
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
});
