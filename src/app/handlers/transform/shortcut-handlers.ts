/**
 * Shortcut handlers for instant-apply transforms from ribbon popover chips.
 * Each handler checks for a selected column, builds a transform spec,
 * and calls StepService.runTransform() directly — no dialog needed.
 */
import { AppStore } from '../../stores/AppStore';
import { StepService } from '../../services/StepService';
import { quoteColumnRef } from '../core/helper-handlers';
import type { ColumnType } from '../../../core/schema-engine';

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
// Text shortcuts
// ============================================================

export async function quickUpper(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Uppercase', c.col, `upper(${c.ref})`, callbacks);
}

export async function quickLower(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Lowercase', c.col, `lower(${c.ref})`, callbacks);
}

export async function quickTitlecase(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Title Case', c.col, `titlecase(${c.ref})`, callbacks);
}

export async function quickTrim(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Trim', c.col, `trim(${c.ref})`, callbacks);
}

export async function quickLen(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Length', `${c.col}_len`, `len(${c.ref})`, callbacks);
}

// ============================================================
// Date extract shortcuts
// ============================================================

export async function quickExtractYear(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Extract Year', `${c.col}_year`, `year(${c.ref})`, callbacks);
}

export async function quickExtractMonth(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Extract Month', `${c.col}_month`, `month(${c.ref})`, callbacks);
}

export async function quickExtractDay(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Extract Day', `${c.col}_day`, `day(${c.ref})`, callbacks);
}

export async function quickExtractQuarter(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Extract Quarter', `${c.col}_quarter`, `quarter(${c.ref})`, callbacks);
}

export async function quickExtractWeekday(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Extract Weekday', `${c.col}_weekday`, `weekday(${c.ref})`, callbacks);
}

export async function quickExtractWeek(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Extract Week', `${c.col}_week`, `week(${c.ref})`, callbacks);
}

// ============================================================
// Date truncate shortcuts
// ============================================================

export async function quickTruncYear(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive(
    'Truncate to Year',
    `${c.col}_year_trunc`,
    `date_trunc(${c.ref}, "year")`,
    callbacks
  );
}

export async function quickTruncMonth(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive(
    'Truncate to Month',
    `${c.col}_month_trunc`,
    `date_trunc(${c.ref}, "month")`,
    callbacks
  );
}

export async function quickTruncWeek(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive(
    'Truncate to Week',
    `${c.col}_week_trunc`,
    `date_trunc(${c.ref}, "week")`,
    callbacks
  );
}

export async function quickTruncDay(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive(
    'Truncate to Day',
    `${c.col}_day_trunc`,
    `date_trunc(${c.ref}, "day")`,
    callbacks
  );
}

// ============================================================
// Number shortcuts
// ============================================================

export async function quickRound(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Round', c.col, `round(${c.ref})`, callbacks);
}

export async function quickFloor(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Floor', c.col, `floor(${c.ref})`, callbacks);
}

export async function quickCeil(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Ceiling', c.col, `ceil(${c.ref})`, callbacks);
}

export async function quickTrunc(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Truncate Decimals', c.col, `trunc(${c.ref})`, callbacks);
}

export async function quickAbs(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Absolute Value', c.col, `abs(${c.ref})`, callbacks);
}

export async function quickSign(callbacks: any) {
  const c = getColRef();
  if (!c) return;
  await applyDerive('Sign', `${c.col}_sign`, `sign(${c.ref})`, callbacks);
}

// ============================================================
// Convert shortcuts
// ============================================================

export async function quickConvertToString(callbacks: any) {
  const col = AppStore.selectedColumn.value;
  if (!col) return;
  await applyTypes('Convert to Text', col, 'string', callbacks);
}

export async function quickConvertToNumber(callbacks: any) {
  const col = AppStore.selectedColumn.value;
  if (!col) return;
  await applyTypes('Convert to Number', col, 'float', callbacks);
}

export async function quickConvertToInteger(callbacks: any) {
  const col = AppStore.selectedColumn.value;
  if (!col) return;
  await applyTypes('Convert to Integer', col, 'integer', callbacks);
}

export async function quickConvertToDate(callbacks: any) {
  const col = AppStore.selectedColumn.value;
  if (!col) return;
  await applyTypes('Convert to Date', col, 'date', callbacks);
}
