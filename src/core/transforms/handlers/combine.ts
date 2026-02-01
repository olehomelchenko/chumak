import type { FullTransformStep, TransformContext } from '../types';
import { resolveTableFromContext } from '../utils';

export function handleConcat(
  table: any,
  transform: FullTransformStep,
  _schema: string[],
  context: TransformContext | null
): any {
  const { with: targetId, columns: leftCols, targetColumns: rightCols } = transform.concat!;
  let targetTable = resolveTableFromContext(context, targetId, 'Concat');

  let leftTable = table;
  if (leftCols && leftCols.length > 0) {
    leftTable = leftTable.select(...leftCols);
  }
  if (rightCols && rightCols.length > 0) {
    targetTable = targetTable.select(...rightCols);
  }

  return leftTable.concat(targetTable);
}

export function handleUnion(
  table: any,
  transform: FullTransformStep,
  _schema: string[],
  context: TransformContext | null
): any {
  const { with: targetId, columns: leftCols, targetColumns: rightCols } = transform.union!;
  let targetTable = resolveTableFromContext(context, targetId, 'Union');

  let leftTable = table;
  if (leftCols && leftCols.length > 0) {
    leftTable = leftTable.select(...leftCols);
  }
  if (rightCols && rightCols.length > 0) {
    targetTable = targetTable.select(...rightCols);
  }

  return leftTable.union(targetTable);
}

export const combineHandlers = {
  concat: handleConcat,
  union: handleUnion,
};
