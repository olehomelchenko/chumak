/**
 * Shortcut handlers for instant-apply transforms from ribbon popover chips.
 *
 * Instead of 25 individual handler functions, shortcuts are defined as a
 * declarative registry. One generic `executeShortcut()` function looks up
 * the entry and builds the appropriate transform spec.
 *
 * Adding a new shortcut = adding one entry to SHORTCUT_REGISTRY.
 */
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import { quoteColumnRef } from '../core/helper-handlers';
import type { ColumnType } from '../../../core/schema-engine';

// ============================================================
// Registry types
// ============================================================

export interface DeriveShortcutDef {
  id: string;
  label: string;
  category: 'column' | 'text' | 'date' | 'number';
  section: string;
  i18nKey: string;
  fn: string | null; // null = identity (e.g., duplicate)
  arg?: string; // extra function arg (e.g., '"year"' for date_trunc)
  mode: 'overwrite' | 'newCol';
  suffix?: string; // column suffix for newCol mode
}

export interface ConvertShortcutDef {
  id: string;
  label: string;
  category: 'convert';
  i18nKey: string;
  targetType: ColumnType;
  disabledWhenType: string[];
}

export type ShortcutDef = DeriveShortcutDef | ConvertShortcutDef;

// ============================================================
// Registry
// ============================================================

export const SHORTCUT_REGISTRY: ShortcutDef[] = [
  // Column
  {
    id: 'duplicate',
    label: 'Duplicate',
    category: 'column',
    section: 'column',
    i18nKey: 'duplicate',
    fn: null,
    mode: 'newCol',
    suffix: '_copy',
  },

  // Text — Case
  {
    id: 'upper',
    label: 'Uppercase',
    category: 'text',
    section: 'case',
    i18nKey: 'upper',
    fn: 'upper',
    mode: 'overwrite',
  },
  {
    id: 'lower',
    label: 'Lowercase',
    category: 'text',
    section: 'case',
    i18nKey: 'lower',
    fn: 'lower',
    mode: 'overwrite',
  },
  {
    id: 'titlecase',
    label: 'Title Case',
    category: 'text',
    section: 'case',
    i18nKey: 'title',
    fn: 'titlecase',
    mode: 'overwrite',
  },

  // Text — Clean
  {
    id: 'trim',
    label: 'Trim',
    category: 'text',
    section: 'clean',
    i18nKey: 'trim',
    fn: 'trim',
    mode: 'overwrite',
  },

  // Text — Info
  {
    id: 'len',
    label: 'Length',
    category: 'text',
    section: 'info',
    i18nKey: 'len',
    fn: 'len',
    mode: 'newCol',
    suffix: '_len',
  },

  // Date — Extract Part
  {
    id: 'extractYear',
    label: 'Extract Year',
    category: 'date',
    section: 'extractPart',
    i18nKey: 'year',
    fn: 'year',
    mode: 'newCol',
    suffix: '_year',
  },
  {
    id: 'extractMonth',
    label: 'Extract Month',
    category: 'date',
    section: 'extractPart',
    i18nKey: 'month',
    fn: 'month',
    mode: 'newCol',
    suffix: '_month',
  },
  {
    id: 'extractDay',
    label: 'Extract Day',
    category: 'date',
    section: 'extractPart',
    i18nKey: 'day',
    fn: 'day',
    mode: 'newCol',
    suffix: '_day',
  },
  {
    id: 'extractQuarter',
    label: 'Extract Quarter',
    category: 'date',
    section: 'extractPart',
    i18nKey: 'quarter',
    fn: 'quarter',
    mode: 'newCol',
    suffix: '_quarter',
  },
  {
    id: 'extractWeekday',
    label: 'Extract Weekday',
    category: 'date',
    section: 'extractPart',
    i18nKey: 'weekday',
    fn: 'weekday',
    mode: 'newCol',
    suffix: '_weekday',
  },
  {
    id: 'extractWeek',
    label: 'Extract Week',
    category: 'date',
    section: 'extractPart',
    i18nKey: 'week',
    fn: 'week',
    mode: 'newCol',
    suffix: '_week',
  },

  // Date — Truncate To
  {
    id: 'truncYear',
    label: 'Truncate to Year',
    category: 'date',
    section: 'truncateTo',
    i18nKey: 'truncYear',
    fn: 'date_trunc',
    arg: '"year"',
    mode: 'newCol',
    suffix: '_year_trunc',
  },
  {
    id: 'truncMonth',
    label: 'Truncate to Month',
    category: 'date',
    section: 'truncateTo',
    i18nKey: 'truncMonth',
    fn: 'date_trunc',
    arg: '"month"',
    mode: 'newCol',
    suffix: '_month_trunc',
  },
  {
    id: 'truncWeek',
    label: 'Truncate to Week',
    category: 'date',
    section: 'truncateTo',
    i18nKey: 'truncWeek',
    fn: 'date_trunc',
    arg: '"week"',
    mode: 'newCol',
    suffix: '_week_trunc',
  },
  {
    id: 'truncDay',
    label: 'Truncate to Day',
    category: 'date',
    section: 'truncateTo',
    i18nKey: 'truncDay',
    fn: 'date_trunc',
    arg: '"day"',
    mode: 'newCol',
    suffix: '_day_trunc',
  },

  // Number — Rounding
  {
    id: 'round',
    label: 'Round',
    category: 'number',
    section: 'rounding',
    i18nKey: 'round',
    fn: 'round',
    mode: 'overwrite',
  },
  {
    id: 'floor',
    label: 'Floor',
    category: 'number',
    section: 'rounding',
    i18nKey: 'floor',
    fn: 'floor',
    mode: 'overwrite',
  },
  {
    id: 'ceil',
    label: 'Ceiling',
    category: 'number',
    section: 'rounding',
    i18nKey: 'ceil',
    fn: 'ceil',
    mode: 'overwrite',
  },
  {
    id: 'trunc',
    label: 'Truncate Decimals',
    category: 'number',
    section: 'rounding',
    i18nKey: 'trunc',
    fn: 'trunc',
    mode: 'overwrite',
  },

  // Number — Other
  {
    id: 'abs',
    label: 'Absolute Value',
    category: 'number',
    section: 'other',
    i18nKey: 'abs',
    fn: 'abs',
    mode: 'overwrite',
  },
  {
    id: 'sign',
    label: 'Sign',
    category: 'number',
    section: 'other',
    i18nKey: 'sign',
    fn: 'sign',
    mode: 'newCol',
    suffix: '_sign',
  },

  // Convert
  {
    id: 'convertToString',
    label: 'Convert to Text',
    category: 'convert',
    i18nKey: 'toText',
    targetType: 'string',
    disabledWhenType: ['string'],
  },
  {
    id: 'convertToNumber',
    label: 'Convert to Number',
    category: 'convert',
    i18nKey: 'toNumber',
    targetType: 'float',
    disabledWhenType: ['float'],
  },
  {
    id: 'convertToInteger',
    label: 'Convert to Integer',
    category: 'convert',
    i18nKey: 'toInteger',
    targetType: 'integer',
    disabledWhenType: ['integer'],
  },
  {
    id: 'convertToDate',
    label: 'Convert to Date',
    category: 'convert',
    i18nKey: 'toDate',
    targetType: 'date',
    disabledWhenType: ['date', 'datetime'],
  },
];

// ============================================================
// Internal helpers
// ============================================================

function getColRef(): { col: string; ref: string } | null {
  const col = AppStore.selectedColumn.value;
  if (!col) return null;
  const quoted = quoteColumnRef(col);
  // Wrap in brackets if quoteColumnRef didn't already
  const ref = quoted.startsWith('[') ? quoted : `[${quoted}]`;
  return { col, ref };
}

async function applyDerive(
  label: string,
  outputCol: string,
  expression: string,
  callbacks: any
): Promise<void> {
  await StepService.runTransform(label, { derive: { [outputCol]: expression } }, callbacks);
  AppStore.selectedColumn.value = null;
}

async function applyTypes(
  label: string,
  col: string,
  targetType: ColumnType,
  callbacks: any
): Promise<void> {
  await StepService.runTransform(label, { types: { [col]: targetType } }, callbacks);
  AppStore.selectedColumn.value = null;
}

// ============================================================
// Public API
// ============================================================

export async function executeShortcut(id: string, callbacks: any): Promise<void> {
  const def = SHORTCUT_REGISTRY.find((s) => s.id === id);
  if (!def) return;

  if (def.category === 'convert') {
    const col = AppStore.selectedColumn.value;
    if (!col) return;
    await applyTypes(def.label, col, (def as ConvertShortcutDef).targetType, callbacks);
  } else {
    const c = getColRef();
    if (!c) return;
    const d = def as DeriveShortcutDef;
    const outputCol = d.mode === 'overwrite' ? c.col : `${c.col}${d.suffix}`;
    let expression: string;
    if (d.fn === null) {
      expression = c.ref;
    } else if (d.arg) {
      expression = `${d.fn}(${c.ref}, ${d.arg})`;
    } else {
      expression = `${d.fn}(${c.ref})`;
    }
    await applyDerive(def.label, outputCol, expression, callbacks);
  }
}

export function getShortcutsByCategory(category: string): ShortcutDef[] {
  return SHORTCUT_REGISTRY.filter((s) => s.category === category);
}
