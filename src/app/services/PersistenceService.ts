import { autoSave, clearAllData as storageClearAllData } from '../infrastructure/storage';
import { AppStore } from '../stores/AppStore';
import i18n from '../../i18n';

/**
 * PersistenceService
 *
 * Handles application-level persistence logic, wrapping the core storage layer.
 * Part of Phase 3a: Logic Extraction.
 */
export class PersistenceService {
  /**
   * Triggers an auto-save of all current sources and models from AppStore.
   * Virtual sources (like metrics) are filtered out - they are not persisted.
   */
  static async autoSave(): Promise<void> {
    // Filter out virtual sources - they should not be persisted
    const sources = AppStore.sources.value.filter((s: any) => !s.isVirtual);
    const models = AppStore.models.value;
    await autoSave(sources, models);
  }

  /**
   * Clears all data from the application and storage
   */
  static async clearAllData(
    confirm: (msg: string, confirmLabel?: string) => Promise<boolean>,
    alert: (msg: string) => Promise<void>
  ): Promise<void> {
    const confirmed = await confirm(
      i18n.t('confirms.clearData', { ns: 'common' }),
      i18n.t('buttons.clearAll', { ns: 'common' })
    );
    if (!confirmed) return;

    try {
      await storageClearAllData();
      AppStore.reset();
      await alert(i18n.t('notifications.dataCleared', { ns: 'common' }));
    } catch (error: any) {
      console.error('Failed to clear data:', error);
      await alert(i18n.t('system.clearDataFailed', { ns: 'errors', message: error.message }));
    }
  }
}
