import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppStore } from '../stores/AppStore';
import { createTestModel, createTestSource } from '../handlers/test-utils';

vi.mock('../handlers/core/notification-handlers', () => ({
  showSuccess: vi.fn(),
}));

import { ExportService } from './ExportService';
import { showSuccess } from '../handlers/core/notification-handlers';

describe('ExportService', () => {
  let alert: ReturnType<typeof vi.fn>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    AppStore.reset();
    vi.clearAllMocks();
    alert = vi.fn().mockResolvedValue(undefined);
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('exportCSV', () => {
    it('alerts and returns undefined when no data', async () => {
      AppStore.currentData.value = null;

      const result = await ExportService.exportCSV(alert);

      expect(result).toBeUndefined();
      expect(alert).toHaveBeenCalledWith('No data to export. Import a dataset first.');
    });

    it('alerts and returns undefined when data is empty', async () => {
      AppStore.currentData.value = [];

      const result = await ExportService.exportCSV(alert);

      expect(result).toBeUndefined();
      expect(alert).toHaveBeenCalledWith('No data to export. Import a dataset first.');
    });

    it('returns CSV string for valid data', async () => {
      AppStore.currentData.value = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];

      const result = await ExportService.exportCSV(alert);

      expect(result).toBeDefined();
      expect(result).toContain('name');
      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
    });

    it('calls showSuccess on successful export', async () => {
      AppStore.currentData.value = [{ name: 'Alice' }];
      AppStore.activeModel.value = createTestModel({ name: 'TestModel' });

      await ExportService.exportCSV(alert);

      expect(showSuccess).toHaveBeenCalled();
      const msg = vi.mocked(showSuccess).mock.calls[0][0];
      expect(msg).toContain('TestModel');
    });

    it('uses "export" as filename when no active model', async () => {
      AppStore.currentData.value = [{ name: 'Alice' }];
      AppStore.activeModel.value = null;

      await ExportService.exportCSV(alert);

      const msg = vi.mocked(showSuccess).mock.calls[0][0];
      expect(msg).toContain('export');
    });
  });

  describe('exportDataJSON', () => {
    it('alerts when no data', async () => {
      AppStore.currentData.value = null;

      await ExportService.exportDataJSON(alert);

      expect(alert).toHaveBeenCalledWith('No data to export. Import a dataset first.');
    });

    it('exports data as JSON', async () => {
      AppStore.currentData.value = [{ name: 'Alice' }];

      await ExportService.exportDataJSON(alert);

      expect(showSuccess).toHaveBeenCalled();
    });
  });

  describe('copyCSVToClipboard', () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
      mockWriteText.mockClear().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });
    });

    it('alerts when no page data', async () => {
      const getPaginatedData = vi.fn().mockReturnValue([]);

      await ExportService.copyCSVToClipboard(getPaginatedData, alert);

      expect(alert).toHaveBeenCalledWith('No data to export. Import a dataset first.');
    });

    it('writes CSV to clipboard', async () => {
      const getPaginatedData = vi.fn().mockReturnValue([{ name: 'Alice', age: 30 }]);

      await ExportService.copyCSVToClipboard(getPaginatedData, alert);

      expect(mockWriteText).toHaveBeenCalled();
      const written = mockWriteText.mock.calls[0][0];
      expect(written).toContain('name');
      expect(written).toContain('Alice');
      expect(showSuccess).toHaveBeenCalledWith('Copied 1 rows (CSV)');
    });

    it('alerts on clipboard error', async () => {
      mockWriteText.mockRejectedValueOnce(new Error('Clipboard denied'));
      const getPaginatedData = vi.fn().mockReturnValue([{ name: 'Alice' }]);

      await ExportService.copyCSVToClipboard(getPaginatedData, alert);

      expect(alert).toHaveBeenCalledWith('Failed to copy to clipboard: Clipboard denied');
    });
  });

  describe('copyJSONToClipboard', () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
      mockWriteText.mockClear().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });
    });

    it('alerts when no page data', async () => {
      const getPaginatedData = vi.fn().mockReturnValue([]);

      await ExportService.copyJSONToClipboard(getPaginatedData, alert);

      expect(alert).toHaveBeenCalledWith('No data to export. Import a dataset first.');
    });

    it('writes JSON to clipboard', async () => {
      const getPaginatedData = vi.fn().mockReturnValue([{ name: 'Alice' }]);

      await ExportService.copyJSONToClipboard(getPaginatedData, alert);

      expect(mockWriteText).toHaveBeenCalled();
      expect(showSuccess).toHaveBeenCalledWith('Copied 1 rows (JSON)');
    });
  });
});
