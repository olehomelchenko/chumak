/**
 * i18n Key Parity Check
 *
 * Validates that all translation keys in en/ locale files exist in uk/ locale files
 * (and vice versa). Runs as part of CI to catch missing translations early.
 *
 * Usage: npx tsx scripts/check-i18n-keys.ts
 */

import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve(import.meta.dirname, '../src/i18n/locales');
const REFERENCE_LOCALE = 'en';
const TARGET_LOCALES = ['uk'];

type KeyPath = string;

const PLURAL_SUFFIXES = ['_one', '_other', '_few', '_many', '_zero', '_two'];
const PLURAL_SUFFIX_RE = /_(one|other|few|many|zero|two)$/;

/**
 * Recursively extract all key paths from a nested JSON object.
 * Returns flat paths like "validation.required.field"
 */
function extractKeys(obj: Record<string, any>, prefix = ''): KeyPath[] {
  const keys: KeyPath[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...extractKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Build a set of "plural base" keys for a locale.
 * A key is a plural base if either:
 *   1. It has a plural suffix (_one, _other, etc.) — the base is the key without the suffix
 *   2. It's a base key and the same locale has at least one suffixed variant
 *
 * Example: en has "label" + "label_other" → "toolbars.row.label" is a plural base
 *          uk has "label_one" + "label_few" + "label_many" → same plural base
 */
function getPluralBases(keys: Set<KeyPath>): Set<string> {
  const bases = new Set<string>();
  for (const key of keys) {
    const base = key.replace(PLURAL_SUFFIX_RE, '');
    if (base !== key) {
      // Key has a suffix — its base is a plural group
      bases.add(base);
    }
  }
  // Also check base keys that have suffixed siblings
  for (const key of keys) {
    if (!PLURAL_SUFFIX_RE.test(key) && PLURAL_SUFFIXES.some((s) => keys.has(key + s))) {
      bases.add(key);
    }
  }
  return bases;
}

/**
 * Check if a key belongs to a plural group that exists in the other locale.
 * Returns true if the key's plural group is represented in otherKeys.
 */
function isPluralCovered(key: string, otherKeys: Set<KeyPath>, otherBases: Set<string>): boolean {
  const base = key.replace(PLURAL_SUFFIX_RE, '');
  const isSuffixed = base !== key;

  if (isSuffixed) {
    // Suffixed key — check if target has this base as a plural group
    return otherBases.has(base) || otherKeys.has(base);
  }
  // Non-suffixed key — check if it's a plural base used as singular
  // (i.e., there are suffixed siblings in the same locale)
  // If so, check if the target has any suffixed variant
  return otherBases.has(key);
}

/**
 * Load and parse a JSON file
 */
function loadJson(filePath: string): Record<string, any> {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Get all namespace files for a locale
 */
function getNamespaceFiles(locale: string): string[] {
  const localeDir = path.join(LOCALES_DIR, locale);
  return fs
    .readdirSync(localeDir)
    .filter((f) => f.endsWith('.json'))
    .sort();
}

let hasErrors = false;

// Check each target locale against the reference
for (const targetLocale of TARGET_LOCALES) {
  const refFiles = getNamespaceFiles(REFERENCE_LOCALE);
  const targetFiles = getNamespaceFiles(targetLocale);

  // Check for missing namespace files
  for (const file of refFiles) {
    if (!targetFiles.includes(file)) {
      console.error(`MISSING FILE: ${targetLocale}/${file} (exists in ${REFERENCE_LOCALE}/)`);
      hasErrors = true;
    }
  }

  for (const file of targetFiles) {
    if (!refFiles.includes(file)) {
      console.error(`EXTRA FILE: ${targetLocale}/${file} (not in ${REFERENCE_LOCALE}/)`);
      hasErrors = true;
    }
  }

  // Check key parity for each shared namespace
  const sharedFiles = refFiles.filter((f) => targetFiles.includes(f));

  for (const file of sharedFiles) {
    const namespace = file.replace('.json', '');
    const refData = loadJson(path.join(LOCALES_DIR, REFERENCE_LOCALE, file));
    const targetData = loadJson(path.join(LOCALES_DIR, targetLocale, file));

    const refKeys = new Set(extractKeys(refData));
    const targetKeys = new Set(extractKeys(targetData));
    const refBases = getPluralBases(refKeys);
    const targetBases = getPluralBases(targetKeys);

    // Keys in reference but missing from target
    const missingInTarget: string[] = [];
    for (const key of refKeys) {
      if (targetKeys.has(key)) continue;
      if (isPluralCovered(key, targetKeys, targetBases)) continue;
      missingInTarget.push(key);
    }

    // Keys in target but not in reference (potential stale keys)
    const extraInTarget: string[] = [];
    for (const key of targetKeys) {
      if (refKeys.has(key)) continue;
      if (isPluralCovered(key, refKeys, refBases)) continue;
      extraInTarget.push(key);
    }

    if (missingInTarget.length > 0) {
      hasErrors = true;
      console.error(
        `\nMISSING in ${targetLocale}/${namespace}.json (${missingInTarget.length} keys):`
      );
      for (const key of missingInTarget) {
        console.error(`  - ${key}`);
      }
    }

    if (extraInTarget.length > 0) {
      hasErrors = true;
      console.error(
        `\nEXTRA in ${targetLocale}/${namespace}.json (${extraInTarget.length} keys, not in ${REFERENCE_LOCALE}):`
      );
      for (const key of extraInTarget) {
        console.error(`  - ${key}`);
      }
    }
  }
}

if (hasErrors) {
  console.error('\ni18n key parity check FAILED. Fix the issues above.');
  process.exit(1);
} else {
  console.log('i18n key parity check passed. All locales are in sync.');
}
