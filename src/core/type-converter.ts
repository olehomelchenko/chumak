/**
 * Chumak Type Converter
 *
 * Handles type conversion between column types with Power Query-style error cells.
 */

import type { ColumnType } from './schema-engine';
import { parseToDate } from './ast-interpreter';

export interface ConversionError {
  type: 'error';
  message: string;
  toString(): string;
  valueOf(): string;
}

export type ConversionResult = any | ConversionError;

/**
 * Create an error object with custom toString() and valueOf() methods
 * This ensures error objects display as "Error" instead of "[object Object]"
 */
function createErrorObject(message: string): ConversionError {
  const errorObj: ConversionError = {
    type: 'error',
    message,
    toString() {
      return 'Error';
    },
    valueOf() {
      return 'Error';
    },
  };
  return errorObj;
}

/**
 * Convert a value from one type to another
 * Returns error object if conversion fails, otherwise returns converted value
 */
export function convertType(
  value: any,
  fromType: ColumnType,
  toType: ColumnType
): ConversionResult {
  // Note: fromType is a schema hint; actual runtime type may differ
  // We check runtime types in conversion functions, so we always attempt conversion

  // Handle null/undefined
  if (value === null || value === undefined) {
    // For date/datetime, null is acceptable
    if (toType === 'date' || toType === 'datetime') {
      return null;
    }
    // For other types, return error or null based on target type
    return null;
  }

  // Handle empty strings
  if (typeof value === 'string' && value.trim() === '') {
    if (toType === 'string') {
      return value;
    }
    // Empty string to non-string: return null for most cases, error for strict conversions
    if (toType === 'date' || toType === 'datetime') {
      return null;
    }
    // For numeric/boolean, empty string is invalid
    return createErrorObject(`Cannot convert empty string to ${toType}`);
  }

  try {
    // Route to specific conversion function
    switch (toType) {
      case 'string':
        return convertToString(value, fromType);
      case 'integer':
        return convertToInteger(value, fromType);
      case 'float':
        return convertToFloat(value, fromType);
      case 'boolean':
        return convertToBoolean(value, fromType);
      case 'date':
        return convertToDate(value, fromType);
      case 'datetime':
        return convertToDateTime(value, fromType);
      default:
        return createErrorObject(`Unknown target type: ${toType}`);
    }
  } catch (error: any) {
    return createErrorObject(`Conversion error: ${error.message}`);
  }
}

function convertToString(value: any, _fromType: ColumnType): ConversionResult {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Date) {
    // Format as ISO string for dates
    return value.toISOString().split('T')[0]; // YYYY-MM-DD
  }
  // For boolean, numeric, etc., use String()
  return String(value);
}

function convertToInteger(value: any, _fromType: ColumnType): ConversionResult {
  if (typeof value === 'number') {
    // Truncate floats
    if (!Number.isInteger(value)) {
      return Math.trunc(value);
    }
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return createErrorObject('Cannot convert empty string to integer');
    }
    const num = Number(trimmed);
    if (isNaN(num) || !isFinite(num)) {
      return createErrorObject(`Cannot convert "${value}" to integer`);
    }
    // Truncate floats
    return Math.trunc(num);
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return createErrorObject(`Cannot convert ${typeof value} to integer`);
}

function convertToFloat(value: any, _fromType: ColumnType): ConversionResult {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return createErrorObject('Cannot convert empty string to float');
    }
    const num = Number(trimmed);
    if (isNaN(num) || !isFinite(num)) {
      return createErrorObject(`Cannot convert "${value}" to float`);
    }
    return num;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return createErrorObject(`Cannot convert ${typeof value} to float`);
}

function convertToBoolean(value: any, _fromType: ColumnType): ConversionResult {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    // 0 -> false, everything else -> true (including NaN which becomes false)
    return value !== 0 && !isNaN(value) && isFinite(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    // Common truthy patterns
    if (
      trimmed === 'true' ||
      trimmed === '1' ||
      trimmed === 'yes' ||
      trimmed === 'y' ||
      trimmed === 'on'
    ) {
      return true;
    }
    // Common falsy patterns
    if (
      trimmed === 'false' ||
      trimmed === '0' ||
      trimmed === 'no' ||
      trimmed === 'n' ||
      trimmed === 'off' ||
      trimmed === ''
    ) {
      return false;
    }
    // Try parsing as number
    const num = Number(trimmed);
    if (!isNaN(num) && isFinite(num)) {
      return num !== 0;
    }
    // Unknown string pattern
    return createErrorObject(`Cannot convert "${value}" to boolean`);
  }

  if (value instanceof Date) {
    // Date to boolean: always true (dates exist)
    return true;
  }

  return createErrorObject(`Cannot convert ${typeof value} to boolean`);
}

function convertToDate(value: any, _fromType: ColumnType): ConversionResult {
  // Use existing parseToDate utility
  const date = parseToDate(value);
  if (date === null) {
    // parseToDate returns null for invalid dates
    if (value === null || value === undefined || value === '') {
      return null; // null/empty is acceptable for dates
    }
    return createErrorObject(`Cannot convert "${value}" to date`);
  }
  return date;
}

function convertToDateTime(value: any, fromType: ColumnType): ConversionResult {
  // For now, treat datetime same as date (both are Date objects)
  // In the future, we might want different formatting
  return convertToDate(value, fromType);
}
