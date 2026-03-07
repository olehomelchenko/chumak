import { describe, it, expect } from 'vitest';
import {
  DIALOG_REGISTRY,
  getDialogConfig,
  isSlidePanel,
  isCenteredModal,
  getDialogTitle,
  getDialogButtonText,
  isUrlNavigableDialog,
  getDialogsByType,
  getUrlNavigableDialogs,
} from './dialog-registry';
import { DialogStore } from './stores/DialogStore';
import type { DialogName } from './types';

describe('Dialog Registry', () => {
  describe('DIALOG_REGISTRY', () => {
    it('contains all expected transform dialogs', () => {
      const transformDialogs = [
        'filter',
        'derive',
        'sort',
        'sliceRows',
        'index',
        'split',
        'regexpMatch',
        'regexpExtract',
        'date',
        'dedupe',
        'fold',
        'pivot',
        'aggregate',
        'join',
        'append',
        'replace',
        'column-editor',
        'impute',
        // Note: selectPattern, removePattern, and renamePattern are deprecated
        // and unified into column-editor dialog
        'conditional',
      ];

      transformDialogs.forEach((dialogName) => {
        expect(DIALOG_REGISTRY[dialogName]).toBeDefined();
        expect(DIALOG_REGISTRY[dialogName].name).toBe(dialogName);
      });
    });

    it('contains all import dialogs', () => {
      expect(DIALOG_REGISTRY['import-csv']).toBeDefined();
      expect(DIALOG_REGISTRY['import-url']).toBeDefined();
      expect(DIALOG_REGISTRY['import-text']).toBeDefined();
    });

    it('contains all utility dialogs', () => {
      expect(DIALOG_REGISTRY.settings).toBeDefined();
      expect(DIALOG_REGISTRY.download).toBeDefined();
      expect(DIALOG_REGISTRY['type-conversion']).toBeDefined();
    });

    it('contains all info page dialogs', () => {
      expect(DIALOG_REGISTRY.expressions).toBeDefined();
      expect(DIALOG_REGISTRY.reference).toBeDefined();
    });

    it('all dialogs have required fields', () => {
      Object.values(DIALOG_REGISTRY).forEach((config) => {
        expect(config.name).toBeDefined();
        expect(config.title).toBeDefined();
        expect(config.type).toBeDefined();
        expect(['slide-panel', 'centered-modal', 'full-page']).toContain(config.type);
      });
    });
  });

  describe('getDialogConfig', () => {
    it('returns config for valid dialog name', () => {
      const config = getDialogConfig('filter');
      expect(config).toBeDefined();
      expect(config?.name).toBe('filter');
      expect(config?.title).toBe('Filter Rows');
    });

    it('returns undefined for null dialog name', () => {
      const config = getDialogConfig(null);
      expect(config).toBeUndefined();
    });

    it('returns undefined for invalid dialog name', () => {
      const config = getDialogConfig('invalid-dialog' as DialogName);
      expect(config).toBeUndefined();
    });
  });

  describe('isSlidePanel', () => {
    it('returns true for slide panel dialogs', () => {
      expect(isSlidePanel('filter')).toBe(true);
      expect(isSlidePanel('derive')).toBe(true);
      expect(isSlidePanel('join')).toBe(true);
      expect(isSlidePanel('import-csv')).toBe(true);
      expect(isSlidePanel('impute')).toBe(true);
    });

    it('returns false for centered modal dialogs', () => {
      expect(isSlidePanel('settings')).toBe(false);
      expect(isSlidePanel('download')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isSlidePanel(null)).toBe(false);
    });
  });

  describe('isCenteredModal', () => {
    it('returns true for centered modal dialogs', () => {
      expect(isCenteredModal('settings')).toBe(true);
      expect(isCenteredModal('download')).toBe(true);
      expect(isCenteredModal('type-conversion')).toBe(true);
    });

    it('returns false for slide panel dialogs', () => {
      expect(isCenteredModal('filter')).toBe(false);
      expect(isCenteredModal('derive')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isCenteredModal(null)).toBe(false);
    });
  });

  describe('getDialogTitle', () => {
    it('returns correct title for dialog', () => {
      expect(getDialogTitle('filter')).toBe('Filter Rows');
      expect(getDialogTitle('derive')).toBe('Derive Column');
      expect(getDialogTitle('join')).toBe('Join Data');
      expect(getDialogTitle('expressions')).toBe('Reference');
    });

    it('returns empty string for null', () => {
      expect(getDialogTitle(null)).toBe('');
    });

    it('returns empty string for invalid dialog', () => {
      expect(getDialogTitle('invalid' as DialogName)).toBe('');
    });

    it('handles import-csv special case based on isJson state', () => {
      DialogStore.importCsvState.isJson.value = true;
      expect(getDialogTitle('import-csv')).toBe('Import JSON');

      DialogStore.importCsvState.isJson.value = false;
      expect(getDialogTitle('import-csv')).toBe('Import CSV');
    });
  });

  describe('getDialogButtonText', () => {
    it('returns custom button text when specified', () => {
      expect(getDialogButtonText('import-csv')).toBe('Import');
      expect(getDialogButtonText('import-url')).toBe('Fetch Data');
      expect(getDialogButtonText('join')).toBe('Apply Join');
      expect(getDialogButtonText('download')).toBe('Download');
    });

    it('returns default "Apply" for dialogs without custom text', () => {
      expect(getDialogButtonText('filter')).toBe('Apply');
      expect(getDialogButtonText('derive')).toBe('Apply');
      expect(getDialogButtonText('sort')).toBe('Apply');
    });

    it('returns "Apply" for null', () => {
      expect(getDialogButtonText(null)).toBe('Apply');
    });
  });

  describe('isUrlNavigableDialog', () => {
    it('returns true for URL-navigable dialogs', () => {
      expect(isUrlNavigableDialog('expressions')).toBe(true);
      expect(isUrlNavigableDialog('settings')).toBe(true);
      expect(isUrlNavigableDialog('reference')).toBe(true);
    });

    it('returns false for non-navigable dialogs', () => {
      expect(isUrlNavigableDialog('filter')).toBe(false);
      expect(isUrlNavigableDialog('derive')).toBe(false);
      expect(isUrlNavigableDialog('download')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isUrlNavigableDialog(null)).toBe(false);
    });
  });

  describe('getDialogsByType', () => {
    it('returns all slide panel dialogs', () => {
      const slidePanels = getDialogsByType('slide-panel');
      expect(slidePanels).toContain('filter');
      expect(slidePanels).toContain('derive');
      expect(slidePanels).toContain('join');
      expect(slidePanels).toContain('import-csv');
      expect(slidePanels.length).toBeGreaterThan(20);
    });

    it('returns all centered modal dialogs', () => {
      const centeredModals = getDialogsByType('centered-modal');
      expect(centeredModals).toContain('settings');
      expect(centeredModals).toContain('download');
      expect(centeredModals.length).toBeGreaterThan(3);
    });

    it('does not mix dialog types', () => {
      const slidePanels = getDialogsByType('slide-panel');
      const centeredModals = getDialogsByType('centered-modal');

      slidePanels.forEach((name) => {
        expect(centeredModals).not.toContain(name);
      });
    });
  });

  describe('getUrlNavigableDialogs', () => {
    it('returns all URL-navigable dialogs', () => {
      const navigable = getUrlNavigableDialogs();
      expect(navigable).toContain('expressions');
      expect(navigable).toContain('settings');
      expect(navigable).toContain('reference');
    });

    it('does not include non-navigable dialogs', () => {
      const navigable = getUrlNavigableDialogs();
      expect(navigable).not.toContain('filter');
      expect(navigable).not.toContain('derive');
      expect(navigable).not.toContain('download');
    });
  });

  describe('Registry completeness', () => {
    it('all slide panels are marked as slide-panel type', () => {
      const expectedSlidePanels = [
        'filter',
        'derive',
        'sort',
        'sliceRows',
        'index',
        'split',
        'regexpMatch',
        'regexpExtract',
        'date',
        'dedupe',
        'fold',
        'pivot',
        'aggregate',
        'join',
        'append',
        'replace',
        'column-editor',
        'import-csv',
        'import-url',
        'impute',
        // Note: selectPattern, removePattern, and renamePattern are deprecated
        // and unified into column-editor dialog
        'conditional',
      ];

      expectedSlidePanels.forEach((name) => {
        const config = getDialogConfig(name as DialogName);
        expect(config?.type).toBe('slide-panel');
      });
    });

    it('all centered modals are marked as centered-modal type', () => {
      const expectedCenteredModals = [
        'settings',
        'download',
        'expressions',
        'reference',
        'type-conversion',
      ];

      expectedCenteredModals.forEach((name) => {
        const config = getDialogConfig(name as DialogName);
        expect(config?.type).toBe('centered-modal');
      });
    });
  });
});
