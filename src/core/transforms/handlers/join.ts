import type { FullTransformStep, TransformContext } from '../types';
import { resolveTableFromContext } from '../utils';

export function handleJoin(
  table: any,
  transform: FullTransformStep,
  _schema: string[],
  context: TransformContext | null
): any {
  const { right, on, how, suffixes } = transform.join!;
  const rightTable = resolveTableFromContext(context, right, 'Join');

  const leftKeys = on.map((pair: any) => pair[0]);
  const rightKeys = on.map((pair: any) => pair[1]);
  const joinSuffixes = suffixes || ['_x', '_y'];

  const joinOptions = { suffix: joinSuffixes };
  const keys = leftKeys.length === 1 ? [leftKeys[0], rightKeys[0]] : [leftKeys, rightKeys];

  if (how === 'inner' || !how) return table.join(rightTable, keys, null, joinOptions);
  if (how === 'left') return table.join_left(rightTable, keys, null, joinOptions);
  if (how === 'right') return table.join_right(rightTable, keys, null, joinOptions);
  if (how === 'full') return table.join_full(rightTable, keys, null, joinOptions);
  if (how === 'cross') return table.cross(rightTable, null, joinOptions);

  throw new Error(`Unknown join type: ${how}`);
}

export function handleSemijoin(
  table: any,
  transform: FullTransformStep,
  _schema: string[],
  context: TransformContext | null
): any {
  const { right, on } = transform.semijoin!;
  const rightTable = resolveTableFromContext(context, right, 'Semijoin');

  const leftKeys = on.map((pair: [string, string]) => pair[0]);
  const rightKeys = on.map((pair: [string, string]) => pair[1]);
  const keys = leftKeys.length === 1 ? [leftKeys[0], rightKeys[0]] : [leftKeys, rightKeys];

  return table.semijoin(rightTable, keys);
}

export function handleAntijoin(
  table: any,
  transform: FullTransformStep,
  _schema: string[],
  context: TransformContext | null
): any {
  const { right, on } = transform.antijoin!;
  const rightTable = resolveTableFromContext(context, right, 'Antijoin');

  const leftKeys = on.map((pair: [string, string]) => pair[0]);
  const rightKeys = on.map((pair: [string, string]) => pair[1]);
  const keys = leftKeys.length === 1 ? [leftKeys[0], rightKeys[0]] : [leftKeys, rightKeys];

  return table.antijoin(rightTable, keys);
}

export function handleLookup(
  table: any,
  transform: FullTransformStep,
  _schema: string[],
  context: TransformContext | null
): any {
  const { right, on, values } = transform.lookup!;
  const rightTable = resolveTableFromContext(context, right, 'Lookup');

  const leftKeys = on.map((pair: [string, string]) => pair[0]);
  const rightKeys = on.map((pair: [string, string]) => pair[1]);
  const keys = leftKeys.length === 1 ? [leftKeys[0], rightKeys[0]] : [leftKeys, rightKeys];

  return table.lookup(rightTable, keys, ...values);
}

export const joinHandlers = {
  join: handleJoin,
  semijoin: handleSemijoin,
  antijoin: handleAntijoin,
  lookup: handleLookup,
};
