import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppStore } from '../stores/AppStore';

vi.mock('../../core/storage', () => ({
  autoSave: vi.fn().mockResolvedValue(undefined),
  clearAllData: vi.fn().mockResolvedValue(undefined),
}));

import { PersistenceService } from './PersistenceService';
import { autoSave, clearAllData as storageClearAllData } from '../../core/storage';

describe('PersistenceService', () => {
  beforeEach(() => {
    AppStore.reset();
    vi.clearAllMocks();
  });

  describe('autoSave', () => {
    it('passes sources and models to storage', async () => {
      const source = { id: 'src_1', name: 'Test' } as any;
      const model = { id: 'mdl_1', name: 'Model' } as any;
      AppStore.sources.value = [source];
      AppStore.models.value = [model];

      await PersistenceService.autoSave();

      expect(autoSave).toHaveBeenCalledWith([source], [model]);
    });

    it('filters out virtual sources', async () => {
      const realSource = { id: 'src_1', name: 'Real' } as any;
      const virtualSource = { id: 'src_v', name: 'Virtual', isVirtual: true } as any;
      AppStore.sources.value = [realSource, virtualSource];
      AppStore.models.value = [];

      await PersistenceService.autoSave();

      expect(autoSave).toHaveBeenCalledWith([realSource], []);
    });

    it('passes empty arrays when no data', async () => {
      await PersistenceService.autoSave();

      expect(autoSave).toHaveBeenCalledWith([], []);
    });
  });

  describe('clearAllData', () => {
    it('calls storage, resets store, and alerts on confirm', async () => {
      const confirm = vi.fn().mockResolvedValue(true);
      const alert = vi.fn().mockResolvedValue(undefined);
      AppStore.sources.value = [{ id: 'src_1' } as any];

      await PersistenceService.clearAllData(confirm, alert);

      expect(confirm).toHaveBeenCalledWith(
        'Are you sure you want to clear all data? This cannot be undone.'
      );
      expect(storageClearAllData).toHaveBeenCalled();
      expect(AppStore.sources.value).toEqual([]);
      expect(alert).toHaveBeenCalledWith('All data has been cleared.');
    });

    it('does nothing when user cancels', async () => {
      const confirm = vi.fn().mockResolvedValue(false);
      const alert = vi.fn();
      AppStore.sources.value = [{ id: 'src_1' } as any];

      await PersistenceService.clearAllData(confirm, alert);

      expect(storageClearAllData).not.toHaveBeenCalled();
      expect(AppStore.sources.value).toHaveLength(1);
      expect(alert).not.toHaveBeenCalled();
    });

    it('shows error alert when storage throws', async () => {
      const confirm = vi.fn().mockResolvedValue(true);
      const alert = vi.fn().mockResolvedValue(undefined);
      vi.mocked(storageClearAllData).mockRejectedValueOnce(new Error('Storage full'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await PersistenceService.clearAllData(confirm, alert);

      expect(alert).toHaveBeenCalledWith('Failed to clear data: Storage full');
      consoleSpy.mockRestore();
    });
  });
});
