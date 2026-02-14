import { describe, it, expect, beforeEach } from 'vitest';
import { AppStore } from './AppStore';

describe('AppStore', () => {
  beforeEach(() => {
    AppStore.reset();
  });

  describe('default values', () => {
    it('data signals start empty', () => {
      expect(AppStore.sources.value).toEqual([]);
      expect(AppStore.models.value).toEqual([]);
      expect(AppStore.activeSource.value).toBeNull();
      expect(AppStore.activeModel.value).toBeNull();
      expect(AppStore.currentData.value).toBeNull();
      expect(AppStore.columns.value).toEqual([]);
    });

    it('navigation signals start at defaults', () => {
      expect(AppStore.viewMode.value).toBe('empty');
      expect(AppStore.activeStepIndex.value).toBeNull();
      expect(AppStore.viewingIntermediate.value).toBe(false);
    });

    it('UI signals start at defaults', () => {
      expect(AppStore.ribbonTab.value).toBe('prepare');
      expect(AppStore.activeTab.value).toBe('steps');
      expect(AppStore.activeDialog.value).toBeNull();
      expect(AppStore.isDragging.value).toBe(false);
      expect(AppStore.selectedColumn.value).toBeNull();
      expect(AppStore.isTransforming.value).toBe(false);
      expect(AppStore.transformMessage.value).toBe('');
    });

    it('JSON editor signals start at defaults', () => {
      expect(AppStore.jsonEditMode.value).toBe(false);
      expect(AppStore.jsonEditContent.value).toBe('');
      expect(AppStore.jsonEditError.value).toBeNull();
    });

    it('notification signals start empty', () => {
      expect(AppStore.notifications.value).toEqual([]);
      expect(AppStore.notificationIdCounter.value).toBe(0);
    });

    it('modal signals start hidden', () => {
      expect(AppStore.messageBox.value.visible).toBe(false);
      expect(AppStore.stepRemovalModal.value.visible).toBe(false);
      expect(AppStore.dependencyImpactModal.value.visible).toBe(false);
    });
  });

  describe('reset', () => {
    it('restores data signals after mutation', () => {
      AppStore.sources.value = [{ id: 'src_1' } as any];
      AppStore.models.value = [{ id: 'mdl_1' } as any];
      AppStore.activeSource.value = { id: 'src_1' } as any;
      AppStore.activeModel.value = { id: 'mdl_1' } as any;
      AppStore.currentData.value = [{ a: 1 }];
      AppStore.columns.value = ['a'];

      AppStore.reset();

      expect(AppStore.sources.value).toEqual([]);
      expect(AppStore.models.value).toEqual([]);
      expect(AppStore.activeSource.value).toBeNull();
      expect(AppStore.activeModel.value).toBeNull();
      expect(AppStore.currentData.value).toBeNull();
      expect(AppStore.columns.value).toEqual([]);
    });

    it('restores navigation and UI signals after mutation', () => {
      AppStore.viewMode.value = 'model';
      AppStore.activeStepIndex.value = 5;
      AppStore.viewingIntermediate.value = true;
      AppStore.ribbonTab.value = 'transform';
      AppStore.activeTab.value = 'data';
      AppStore.activeDialog.value = 'filter';
      AppStore.isDragging.value = true;
      AppStore.selectedColumn.value = 'col';
      AppStore.isTransforming.value = true;
      AppStore.transformMessage.value = 'Loading...';

      AppStore.reset();

      expect(AppStore.viewMode.value).toBe('empty');
      expect(AppStore.activeStepIndex.value).toBeNull();
      expect(AppStore.viewingIntermediate.value).toBe(false);
      expect(AppStore.ribbonTab.value).toBe('prepare');
      expect(AppStore.activeTab.value).toBe('steps');
      expect(AppStore.activeDialog.value).toBeNull();
      expect(AppStore.isDragging.value).toBe(false);
      expect(AppStore.selectedColumn.value).toBeNull();
      expect(AppStore.isTransforming.value).toBe(false);
      expect(AppStore.transformMessage.value).toBe('');
    });

    it('restores JSON editor signals after mutation', () => {
      AppStore.jsonEditMode.value = true;
      AppStore.jsonEditContent.value = '{"key": "value"}';

      AppStore.reset();

      expect(AppStore.jsonEditMode.value).toBe(false);
      expect(AppStore.jsonEditContent.value).toBe('');
    });

    it('restores notification signals after mutation', () => {
      AppStore.notifications.value = [{ id: 1, message: 'test' } as any];
      AppStore.notificationIdCounter.value = 5;

      AppStore.reset();

      expect(AppStore.notifications.value).toEqual([]);
      expect(AppStore.notificationIdCounter.value).toBe(0);
    });

    it('restores modal signals with correct nested structure', () => {
      AppStore.messageBox.value = {
        visible: true,
        title: 'Confirm',
        message: 'Are you sure?',
        type: 'confirm',
        inputValue: 'input',
        resolve: () => {},
      };
      AppStore.stepRemovalModal.value = {
        visible: true,
        stepIndex: 3,
        stepName: 'Filter',
        affectedSteps: ['Derive', 'Sort'],
        removeMode: 'single',
        resolve: () => {},
      };
      AppStore.dependencyImpactModal.value = {
        visible: true,
        dependentModels: [{ id: 'mdl_1', name: 'Test', sourceName: 'Source' }],
        action: 'recalculate',
        resolve: () => {},
      };

      AppStore.reset();

      expect(AppStore.messageBox.value).toEqual({
        visible: false,
        title: '',
        message: '',
        type: 'alert',
        inputValue: '',
        resolve: null,
      });
      expect(AppStore.stepRemovalModal.value).toEqual({
        visible: false,
        stepIndex: -1,
        stepName: '',
        affectedSteps: [],
        removeMode: 'all',
        resolve: null,
      });
      expect(AppStore.dependencyImpactModal.value).toEqual({
        visible: false,
        dependentModels: [],
        action: 'mark-stale',
        resolve: null,
      });
    });

    it('restores type menu and viewing schema signals', () => {
      AppStore.typeMenuOpen.value = true;
      AppStore.typeMenuCol.value = 'age';
      AppStore.viewingSchema.value = [{ name: 'col', type: 'string' } as any];

      AppStore.reset();

      expect(AppStore.typeMenuOpen.value).toBe(false);
      expect(AppStore.typeMenuCol.value).toBeNull();
      expect(AppStore.viewingSchema.value).toBeNull();
    });

    it('is idempotent — calling twice produces same state', () => {
      AppStore.sources.value = [{ id: 'src_1' } as any];
      AppStore.reset();
      const stateAfterFirst = {
        sources: AppStore.sources.value,
        viewMode: AppStore.viewMode.value,
        notifications: AppStore.notifications.value,
      };

      AppStore.reset();
      expect(AppStore.sources.value).toEqual(stateAfterFirst.sources);
      expect(AppStore.viewMode.value).toBe(stateAfterFirst.viewMode);
      expect(AppStore.notifications.value).toEqual(stateAfterFirst.notifications);
    });
  });

  describe('hasData computed', () => {
    it('returns false when sources is empty', () => {
      expect(AppStore.hasData.value).toBe(false);
    });

    it('returns true when sources has entries', () => {
      AppStore.sources.value = [{ id: 'src_1' } as any];
      expect(AppStore.hasData.value).toBe(true);
    });

    it('returns false after sources is emptied', () => {
      AppStore.sources.value = [{ id: 'src_1' } as any];
      expect(AppStore.hasData.value).toBe(true);

      AppStore.sources.value = [];
      expect(AppStore.hasData.value).toBe(false);
    });
  });

  describe('signal independence', () => {
    it('mutating one signal does not affect others', () => {
      AppStore.activeModel.value = { id: 'mdl_1' } as any;

      expect(AppStore.currentData.value).toBeNull();
      expect(AppStore.columns.value).toEqual([]);
      expect(AppStore.activeSource.value).toBeNull();
    });
  });
});
