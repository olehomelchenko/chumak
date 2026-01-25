import { AppStore } from '../stores/AppStore';
import { DataRow, ColumnSchema } from '../types';
import { PersistenceService } from './PersistenceService';
import { DependencyService } from './DependencyService';

/**
 * ReplaceSourceService
 *
 * Handles logic for replacing the data of an existing source and managing backups.
 */
export class ReplaceSourceService {
  /**
   * Replaces the data and metadata of an existing source.
   * Marks dependent models as stale and persists changes.
   */
  static async replaceSource(
    sourceId: string,
    newData: DataRow[],
    newColumns: ColumnSchema[],
    metadata: {
      fileName?: string;
      headerMode: string;
      delimiter: string;
    }
  ): Promise<void> {
    // 1. Find source
    const sources = AppStore.sources.value;
    const sourceIndex = sources.findIndex((s) => s.id === sourceId);
    if (sourceIndex === -1) {
      console.error(`ReplaceSourceService: Source ${sourceId} not found`);
      return;
    }

    const source = sources[sourceIndex];

    // 2. Create backup of current state (deep clone to avoid reference issues)
    // We omit the nested backup to keep it flat (one level of undo)
    const { backup: _, ...sourceToBackup } = source;
    source.backup = JSON.parse(JSON.stringify(sourceToBackup));

    // 3. Update source properties with new data
    source.data = newData;
    source.columns = newColumns;
    if (metadata.fileName) source.fileName = metadata.fileName;
    source.headerMode = metadata.headerMode as any;
    source.delimiter = metadata.delimiter;
    source.rowCount = newData.length;

    // 4. Trigger reactivity for sources list
    AppStore.sources.value = [...AppStore.sources.value];

    // 5. Mark dependent models as stale using DependencyService
    const staleIds = DependencyService.markDependentsStale(
      AppStore.models.value,
      AppStore.sources.value,
      sourceId
    );

    // Also update currentData/columns if this source is active
    if (AppStore.activeSource.value?.id === sourceId) {
      AppStore.activeSource.value = { ...source };
      AppStore.currentData.value = newData;
      AppStore.columns.value = newColumns.map((c) => c.name);
    }

    // Trigger reactivity for models list since we changed isStale flags
    AppStore.models.value = [...AppStore.models.value];

    // 6. Persist changes
    await PersistenceService.autoSave();

    // 7. Show notification
    this.notify(
      `Source replaced. ${staleIds.length} model(s) will recompute when accessed.`,
      'success'
    );
  }

  /**
   * Restores a source from its backup if one exists.
   */
  static async restoreBackup(sourceId: string): Promise<void> {
    const sources = AppStore.sources.value;
    const source = sources.find((s) => s.id === sourceId);
    if (!source || !source.backup) {
      console.error(`ReplaceSourceService: Backup not found for source ${sourceId}`);
      return;
    }

    const backup = source.backup;

    // 1. Save current state as new backup (for undo/redo functionality)
    const { backup: _, ...currentAsBackup } = source;
    const newBackup = JSON.parse(JSON.stringify(currentAsBackup));

    // 2. Restore properties from backup
    source.name = backup.name;
    source.data = backup.data;
    source.columns = backup.columns;
    source.fileName = backup.fileName;
    source.headerMode = backup.headerMode;
    source.delimiter = backup.delimiter;
    source.rowCount = backup.rowCount;
    source.customHeaders = backup.customHeaders;

    source.backup = newBackup;

    // 3. Trigger reactivity
    AppStore.sources.value = [...AppStore.sources.value];

    // 3. Mark dependents as stale again
    const staleIds = DependencyService.markDependentsStale(
      AppStore.models.value,
      AppStore.sources.value,
      sourceId
    );

    // Update active source if needed
    if (AppStore.activeSource.value?.id === sourceId) {
      AppStore.activeSource.value = { ...source };
      AppStore.currentData.value = source.data;
      AppStore.columns.value = source.columns.map((c) => c.name);
    }

    AppStore.models.value = [...AppStore.models.value];

    // 4. Persist
    await PersistenceService.autoSave();

    // 5. Notify
    this.notify(`Source restored from backup. ${staleIds.length} model(s) invalidated.`, 'success');
  }

  private static notify(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    const notificationId = ++AppStore.notificationIdCounter.value;
    const newNotification = {
      id: notificationId,
      type,
      title: type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Warning',
      message,
      stepInfo: null,
      visible: true,
    };

    AppStore.notifications.value = [...AppStore.notifications.value, newNotification];

    setTimeout(() => {
      AppStore.notifications.value = AppStore.notifications.value.filter(
        (n) => n.id !== notificationId
      );
    }, 4000);
  }
}
