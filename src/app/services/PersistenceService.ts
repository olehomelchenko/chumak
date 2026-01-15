import { autoSave, clearAllData as storageClearAllData } from '../../core/storage';
import { AppStore } from '../stores/AppStore';

/**
 * PersistenceService
 *
 * Handles application-level persistence logic, wrapping the core storage layer.
 * Part of Phase 3a: Logic Extraction.
 */
export class PersistenceService {
  /**
   * Triggers an auto-save of all current sources and models from AppStore
   */
  static async autoSave(): Promise<void> {
    const sources = AppStore.sources.value;
    const models = AppStore.models.value;
    await autoSave(sources, models);
  }

  /**
   * Clears all data from the application and storage
   */
  static async clearAllData(
    confirm: (msg: string) => Promise<boolean>,
    alert: (msg: string) => Promise<void>
  ): Promise<void> {
    const confirmed = await confirm(
      'Are you sure you want to clear all data? This cannot be undone.'
    );
    if (!confirmed) return;

    try {
      await storageClearAllData();
      AppStore.reset();
      await alert('All data has been cleared.');
    } catch (error: any) {
      console.error('Failed to clear data:', error);
      await alert('Failed to clear data: ' + error.message);
    }
  }
}
