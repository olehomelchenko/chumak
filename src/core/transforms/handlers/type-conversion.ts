import * as aq from 'arquero';
import { ColumnType, SchemaEngine } from '../../schema-engine';
import { convertType } from '../../type-converter';
import type { FullTransformStep } from '../types';

export function handleTypes(table: any, transform: FullTransformStep): any {
  const typeMap = transform.types!;
  const conversions: Record<string, any> = {};

  // Sample some rows to infer current types
  const sampleRows = table.numRows() > 0 ? table.objects().slice(0, 50) : [];

  for (const [colName, targetType] of Object.entries(typeMap)) {
    if (!table.columnNames().includes(colName)) {
      continue; // Column doesn't exist
    }

    // Infer current type from sample data
    // Note: We infer the schema type, but conversion will handle actual runtime types
    let inferredType: ColumnType = 'string';
    if (sampleRows.length > 0) {
      const sampleValues = sampleRows.map((row: any) => row[colName]);
      inferredType = SchemaEngine.inferType(sampleValues);
    }

    // Check if we need conversion by looking at actual value types vs target type
    // If inferred type matches target AND all sample values are already the correct runtime type, skip
    let needsConversion = true;
    if (inferredType === targetType && sampleRows.length > 0) {
      const allCorrectType = sampleRows.every((row: any) => {
        const val = row[colName];
        if (targetType === 'integer' || targetType === 'float') {
          return typeof val === 'number';
        }
        if (targetType === 'boolean') {
          return typeof val === 'boolean';
        }
        if (targetType === 'date' || targetType === 'datetime') {
          return val instanceof Date;
        }
        if (targetType === 'string') {
          return typeof val === 'string';
        }
        return false;
      });
      if (allCorrectType) {
        needsConversion = false;
      }
    }

    if (!needsConversion) continue;

    // Create conversion function using type-converter utility
    // We use the inferred type as a hint, but convertType will handle runtime type checking
    conversions[colName] = (aq as any).escape((d: any) => {
      return convertType(d[colName], inferredType, targetType as ColumnType);
    });
  }

  if (Object.keys(conversions).length > 0) {
    return table.derive(conversions);
  }
  return table;
}

export const typeHandlers = {
  types: handleTypes,
};
