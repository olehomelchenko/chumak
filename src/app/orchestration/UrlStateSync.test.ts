import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { AppStore } from '../stores/AppStore';

// Mock dependencies
vi.mock('../infrastructure/url-state', () => ({
  getUrlState: vi.fn().mockReturnValue({}),
  setUrlState: vi.fn(),
  clearUrlHash: vi.fn(),
}));

vi.mock('../dialog-registry', () => ({
  isUrlNavigableDialog: vi.fn().mockReturnValue(false),
}));

import {
  initUrlStateSync,
  destroyUrlStateSync,
  restoreStateFromUrl,
  syncSourceToUrl,
  syncModelToUrl,
  syncModelInfoToUrl,
  syncDatasetInfoToUrl,
  syncDialogToUrl,
  clearDialogFromUrl,
  syncCurrentStateToUrl,
  type UrlSyncCallbacks,
} from './UrlStateSync';

import { getUrlState, setUrlState, clearUrlHash } from '../infrastructure/url-state';
import { isUrlNavigableDialog } from '../dialog-registry';

function makeCallbacks(): UrlSyncCallbacks {
  return {
    openDialog: vi.fn(),
    switchToModel: vi.fn(),
    switchToSource: vi.fn(),
    showModelInfo: vi.fn(),
    showDatasetInfo: vi.fn(),
    clearColumnSelection: vi.fn(),
  };
}

const sources = [
  { id: 'src_1', name: 'Source 1' },
  { id: 'src_2', name: 'Source 2' },
];

const models = [
  { id: 'mdl_1', sourceId: 'src_1', name: 'Model 1' },
  { id: 'mdl_2', sourceId: 'src_2', name: 'Model 2' },
];

describe('UrlStateSync', () => {
  beforeEach(() => {
    AppStore.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    destroyUrlStateSync();
  });

  // ──────────────────────────────────────────────
  // restoreStateFromUrl
  // ──────────────────────────────────────────────
  describe('restoreStateFromUrl', () => {
    it('restores dialog page from URL', () => {
      (getUrlState as Mock).mockReturnValue({ page: 'reference', section: 'filter' });
      const cb = makeCallbacks();

      const result = restoreStateFromUrl(sources, models, cb);

      expect(result).toBe(true);
      expect(cb.openDialog).toHaveBeenCalledWith('reference', 'filter');
      expect(setUrlState).toHaveBeenCalledWith({ page: 'reference', section: 'filter' });
    });

    it('restores dialog page without section', () => {
      (getUrlState as Mock).mockReturnValue({ page: 'settings' });
      const cb = makeCallbacks();

      const result = restoreStateFromUrl(sources, models, cb);

      expect(result).toBe(true);
      expect(cb.openDialog).toHaveBeenCalledWith('settings', undefined);
    });

    it('restores model from URL', () => {
      (getUrlState as Mock).mockReturnValue({ sourceId: 'src_1', modelId: 'mdl_1' });
      const cb = makeCallbacks();

      const result = restoreStateFromUrl(sources, models, cb);

      expect(result).toBe(true);
      expect(cb.switchToModel).toHaveBeenCalledWith(models[0]);
      expect(cb.showModelInfo).not.toHaveBeenCalled();
    });

    it('restores model info view from URL', () => {
      (getUrlState as Mock).mockReturnValue({
        sourceId: 'src_1',
        modelId: 'mdl_1',
        section: 'info',
      });
      const cb = makeCallbacks();

      const result = restoreStateFromUrl(sources, models, cb);

      expect(result).toBe(true);
      expect(cb.switchToModel).toHaveBeenCalledWith(models[0]);
      expect(cb.showModelInfo).toHaveBeenCalled();
    });

    it('restores source from URL', () => {
      (getUrlState as Mock).mockReturnValue({ sourceId: 'src_2' });
      const cb = makeCallbacks();

      const result = restoreStateFromUrl(sources, models, cb);

      expect(result).toBe(true);
      expect(cb.switchToSource).toHaveBeenCalledWith(sources[1]);
    });

    it('restores dataset info view from URL', () => {
      (getUrlState as Mock).mockReturnValue({ sourceId: 'src_1', section: 'info' });
      const cb = makeCallbacks();

      const result = restoreStateFromUrl(sources, models, cb);

      expect(result).toBe(true);
      expect(cb.showDatasetInfo).toHaveBeenCalledWith(sources[0]);
    });

    it('clears URL for stale model ID', () => {
      (getUrlState as Mock).mockReturnValue({ sourceId: 'src_1', modelId: 'mdl_gone' });
      const cb = makeCallbacks();

      const result = restoreStateFromUrl(sources, models, cb);

      expect(result).toBe(false);
      expect(clearUrlHash).toHaveBeenCalled();
      expect(cb.switchToModel).not.toHaveBeenCalled();
    });

    it('clears URL for stale source ID', () => {
      (getUrlState as Mock).mockReturnValue({ sourceId: 'src_gone' });
      const cb = makeCallbacks();

      const result = restoreStateFromUrl(sources, models, cb);

      expect(result).toBe(false);
      expect(clearUrlHash).toHaveBeenCalled();
      expect(cb.switchToSource).not.toHaveBeenCalled();
    });

    it('returns false for empty URL', () => {
      (getUrlState as Mock).mockReturnValue({});
      const cb = makeCallbacks();

      const result = restoreStateFromUrl(sources, models, cb);

      expect(result).toBe(false);
      expect(clearUrlHash).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // handleHashChange (via initUrlStateSync + event)
  // ──────────────────────────────────────────────
  describe('handleHashChange', () => {
    let cb: UrlSyncCallbacks;

    beforeEach(() => {
      cb = makeCallbacks();
      initUrlStateSync(cb);
    });

    function triggerHashChange(): void {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }

    it('opens dialog for page route', () => {
      (getUrlState as Mock).mockReturnValue({ page: 'expressions', section: 'math' });
      AppStore.activeDialog.value = null;

      triggerHashChange();

      expect(cb.openDialog).toHaveBeenCalledWith('expressions', 'math');
    });

    it('does not re-open already active dialog', () => {
      (getUrlState as Mock).mockReturnValue({ page: 'reference' });
      AppStore.activeDialog.value = 'reference';

      triggerHashChange();

      expect(cb.openDialog).not.toHaveBeenCalled();
    });

    it('switches to model on hash change', () => {
      const model = { id: 'mdl_1', sourceId: 'src_1' };
      AppStore.models.value = [model] as any;
      AppStore.activeModel.value = null;
      (getUrlState as Mock).mockReturnValue({ sourceId: 'src_1', modelId: 'mdl_1' });

      triggerHashChange();

      expect(cb.switchToModel).toHaveBeenCalledWith(model);
    });

    it('does not switch if model already active', () => {
      const model = { id: 'mdl_1', sourceId: 'src_1' };
      AppStore.models.value = [model] as any;
      AppStore.activeModel.value = model as any;
      (getUrlState as Mock).mockReturnValue({ sourceId: 'src_1', modelId: 'mdl_1' });

      triggerHashChange();

      expect(cb.switchToModel).not.toHaveBeenCalled();
    });

    it('shows model info on hash change', () => {
      const model = { id: 'mdl_1', sourceId: 'src_1' };
      AppStore.models.value = [model] as any;
      AppStore.activeModel.value = null;
      AppStore.viewMode.value = 'table' as any;
      (getUrlState as Mock).mockReturnValue({
        sourceId: 'src_1',
        modelId: 'mdl_1',
        section: 'info',
      });

      triggerHashChange();

      expect(cb.showModelInfo).toHaveBeenCalled();
    });

    it('switches to source on hash change', () => {
      const source = { id: 'src_1', name: 'Source 1' };
      AppStore.sources.value = [source] as any;
      AppStore.activeSource.value = null;
      (getUrlState as Mock).mockReturnValue({ sourceId: 'src_1' });

      triggerHashChange();

      expect(cb.switchToSource).toHaveBeenCalledWith(source);
    });

    it('shows dataset info on hash change', () => {
      const source = { id: 'src_1', name: 'Source 1' };
      AppStore.sources.value = [source] as any;
      AppStore.activeSource.value = null;
      AppStore.viewMode.value = 'table' as any;
      (getUrlState as Mock).mockReturnValue({ sourceId: 'src_1', section: 'info' });

      triggerHashChange();

      expect(cb.showDatasetInfo).toHaveBeenCalledWith(source);
    });

    it('closes navigable dialog when hash changes to non-page route', () => {
      (getUrlState as Mock).mockReturnValue({});
      (isUrlNavigableDialog as Mock).mockReturnValue(true);
      AppStore.activeDialog.value = 'reference';

      triggerHashChange();

      expect(AppStore.activeDialog.value).toBeNull();
    });

    it('does not close non-navigable dialog', () => {
      (getUrlState as Mock).mockReturnValue({});
      (isUrlNavigableDialog as Mock).mockReturnValue(false);
      AppStore.activeDialog.value = 'filter';

      triggerHashChange();

      expect(AppStore.activeDialog.value).toBe('filter');
    });

    it('ignores hash change after destroy', () => {
      (getUrlState as Mock).mockReturnValue({ page: 'reference' });
      destroyUrlStateSync();

      triggerHashChange();

      expect(cb.openDialog).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // URL sync helpers
  // ──────────────────────────────────────────────
  describe('sync helpers', () => {
    it('syncSourceToUrl sets source in URL', () => {
      syncSourceToUrl('src_1');
      expect(setUrlState).toHaveBeenCalledWith({ sourceId: 'src_1' });
    });

    it('syncModelToUrl sets source and model in URL', () => {
      syncModelToUrl('src_1', 'mdl_1');
      expect(setUrlState).toHaveBeenCalledWith({ sourceId: 'src_1', modelId: 'mdl_1' });
    });

    it('syncModelInfoToUrl sets model info route', () => {
      syncModelInfoToUrl('src_1', 'mdl_1');
      expect(setUrlState).toHaveBeenCalledWith({
        sourceId: 'src_1',
        modelId: 'mdl_1',
        section: 'info',
      });
    });

    it('syncDatasetInfoToUrl sets dataset info route', () => {
      syncDatasetInfoToUrl('src_1');
      expect(setUrlState).toHaveBeenCalledWith({ sourceId: 'src_1', section: 'info' });
    });

    it('syncDialogToUrl sets page for navigable dialog', () => {
      (isUrlNavigableDialog as Mock).mockReturnValue(true);
      syncDialogToUrl('reference', 'filter');
      expect(setUrlState).toHaveBeenCalledWith({ page: 'reference', section: 'filter' });
    });

    it('syncDialogToUrl does nothing for non-navigable dialog', () => {
      (isUrlNavigableDialog as Mock).mockReturnValue(false);
      syncDialogToUrl('filter');
      expect(setUrlState).not.toHaveBeenCalled();
    });

    it('clearDialogFromUrl clears hash for navigable dialog', () => {
      (isUrlNavigableDialog as Mock).mockReturnValue(true);
      clearDialogFromUrl('reference');
      expect(clearUrlHash).toHaveBeenCalled();
    });

    it('clearDialogFromUrl does nothing for non-navigable dialog', () => {
      (isUrlNavigableDialog as Mock).mockReturnValue(false);
      clearDialogFromUrl('filter');
      expect(clearUrlHash).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // syncCurrentStateToUrl
  // ──────────────────────────────────────────────
  describe('syncCurrentStateToUrl', () => {
    it('clears hash when view mode is empty', () => {
      AppStore.viewMode.value = 'empty' as any;
      syncCurrentStateToUrl();
      expect(clearUrlHash).toHaveBeenCalled();
      expect(setUrlState).not.toHaveBeenCalled();
    });

    it('syncs active model to URL', () => {
      AppStore.viewMode.value = 'table' as any;
      AppStore.activeModel.value = { id: 'mdl_1', sourceId: 'src_1' } as any;
      AppStore.activeSource.value = null;

      syncCurrentStateToUrl();

      expect(setUrlState).toHaveBeenCalledWith({ modelId: 'mdl_1', sourceId: 'src_1' });
    });

    it('syncs active source to URL', () => {
      AppStore.viewMode.value = 'table' as any;
      AppStore.activeModel.value = null;
      AppStore.activeSource.value = { id: 'src_1' } as any;

      syncCurrentStateToUrl();

      expect(setUrlState).toHaveBeenCalledWith({ modelId: undefined, sourceId: 'src_1' });
    });
  });
});
