import { DialogStore } from '../../stores/DialogStore';
import { AppStore } from '../../stores/AppStore';
import { parseExpression } from '../../../core/expression-parser';
import { interpretAST } from '../../../core/ast-interpreter';
import { isConversionError } from '../../../core/type-converter';
import * as HelperHandlers from '../core/helper-handlers';
import { StepService } from '../../services/StepService';
import type { PreviewResult } from '../preview-engine';
import i18n from '../../../i18n';

export function getStringColumns(): string[] {
  const schema = HelperHandlers.getActiveSchema.call({
    viewingIntermediate: AppStore.viewingIntermediate.value,
    viewingSchema: AppStore.viewingSchema.value,
    activeModel: AppStore.activeModel.value,
  } as any);
  if (!schema) return [];
  return AppStore.columns.value.filter((col) => {
    const colSchema = schema.find((c) => c.name === col);
    const type = colSchema?.type;
    return type === 'string';
  });
}

export function getCommonFormats() {
  return [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '15/06/2024' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '06/15/2024' },
    { value: 'YYYY.MM.DD', label: 'YYYY.MM.DD', example: '2024.06.15' },
    { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY', example: '15-06-2024' },
    { value: 'MM-DD-YYYY', label: 'MM-DD-YYYY', example: '06-15-2024' },
    { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD', example: '2024/06/15' },
    { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY', example: '15.06.2024' },
    { value: 'DD/MM/YYYY HH:mm', label: 'DD/MM/YYYY HH:mm', example: '15/06/2024 14:30' },
    { value: 'MM/DD/YYYY HH:mm', label: 'MM/DD/YYYY HH:mm', example: '06/15/2024 14:30' },
    { value: 'YYYY-MM-DD HH:mm:ss', label: 'YYYY-MM-DD HH:mm:ss', example: '2024-06-15 14:30:45' },
  ];
}

/**
 * Pure preview compute for parseDate — called by useTransformPreview in the component.
 */
export function computeParseDatePreview(colVal: string, formatVal: string): PreviewResult | null {
  const data = AppStore.currentData.value;
  if (!colVal || !formatVal || !data?.length) return null;

  const previewLimit = AppStore.uxSettings.value.preview.rowLimit;
  const samples = data.slice(0, previewLimit);
  const colRef = HelperHandlers.quoteColumnRef.call(null as any, colVal);
  const outputColName = `${colVal}_parsed`;
  const expression = `parse_date(${colRef}, "${formatVal.replace(/"/g, '\\"')}")`;

  let successCount = 0;
  const previewRows = samples.map((row) => {
    const previewRow: any = { [colVal]: row[colVal] };
    try {
      const ast = parseExpression(expression);
      const result = interpretAST(ast, row);
      const isError = isConversionError(result);
      previewRow[outputColName] = result != null && !isError ? String(result) : '(null)';
      if (result != null && !isError) successCount++;
    } catch {
      previewRow[outputColName] = '(error)';
    }
    return previewRow;
  });

  const totalSampled = previewRows.length;
  const failCount = totalSampled - successCount;

  return {
    title: 'Parse Date Preview',
    stats: `<strong>${successCount}</strong> of ${totalSampled} parsed${failCount > 0 ? ` (<strong>${failCount} failed</strong>)` : ''}`,
    columns: [colVal, outputColName],
    newColumns: [outputColName],
    rows: previewRows,
  };
}

/**
 * Get a sample value from the selected column.
 */
export function getSampleValue(colVal: string): string {
  const data = AppStore.currentData.value;
  if (!colVal || !data?.length) return '';

  const previewLimit = AppStore.uxSettings.value.preview.rowLimit;
  const searchData = data.slice(0, previewLimit);

  for (const row of searchData) {
    if (row[colVal] != null && String(row[colVal]).trim() !== '') {
      return String(row[colVal]);
    }
  }
  return '';
}

export async function applyParseDateTransform(callbacks: any) {
  const state = DialogStore.activeDialogState.value;
  if (!state) return;
  const colVal = state.column as string;
  const formatVal = state.format as string;

  if (!colVal) {
    await callbacks.onError?.(i18n.t('validation.selection.sourceColumn', { ns: 'errors' }));
    return;
  }

  if (!formatVal) {
    await callbacks.onError?.(i18n.t('validation.required.format', { ns: 'errors' }));
    return;
  }

  const colRef = HelperHandlers.quoteColumnRef.call(null as any, colVal);
  const outputColName = `${colVal}_parsed`;
  const expression = `parse_date(${colRef}, "${formatVal.replace(/"/g, '\\"')}")`;

  const deriveSpecs: Record<string, string> = { [outputColName]: expression };

  await StepService.runTransform(`Parse Date: ${colVal}`, { derive: deriveSpecs }, callbacks);
}
