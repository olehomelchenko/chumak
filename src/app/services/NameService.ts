import { AppStore } from '../stores/AppStore';

/**
 * NameService
 *
 * Ensures unique naming across sources and models.
 * Source names are globally unique. Model names are unique per-source.
 * v2 export constructs globally-unique composite keys (sourceName/modelName).
 * All comparisons are case-insensitive.
 */
export class NameService {
  /**
   * Checks if a source name is already taken (case-insensitive).
   * @param name - The name to check
   * @param excludeId - Optional source ID to exclude (for rename operations)
   */
  static isSourceNameTaken(name: string, excludeId?: string): boolean {
    const lower = name.toLowerCase();
    return AppStore.sources.value.some((s) => s.name.toLowerCase() === lower && s.id !== excludeId);
  }

  /**
   * Checks if a model name is already taken within the same source (case-insensitive).
   * @param name - The name to check
   * @param sourceId - The source (or parent model) ID to scope the check to
   * @param excludeId - Optional model ID to exclude (for rename operations)
   */
  static isModelNameTaken(name: string, sourceId: string, excludeId?: string): boolean {
    const lower = name.toLowerCase();
    return AppStore.models.value.some(
      (m) => m.sourceId === sourceId && m.name.toLowerCase() === lower && m.id !== excludeId
    );
  }

  /**
   * Generates a unique name by appending -2, -3, etc. if the base name is taken.
   * @param baseName - The desired name
   * @param isTaken - Function that checks if a name is already in use
   * @returns The first available name (baseName, baseName-2, baseName-3, ...)
   */
  static suggestUniqueName(baseName: string, isTaken: (name: string) => boolean): string {
    if (!isTaken(baseName)) return baseName;

    let counter = 2;
    while (isTaken(`${baseName}-${counter}`)) {
      counter++;
    }
    return `${baseName}-${counter}`;
  }
}
