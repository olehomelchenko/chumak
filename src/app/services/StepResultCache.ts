import type { ColumnSchema } from '../../core/schema-engine';

export interface StepCheckpoint {
  modelId: string;
  stepIndex: number;
  data: any[];
  schema: ColumnSchema[];
  columns: string[];
  stepsFingerprint: string;
}

let cache: StepCheckpoint | null = null;

function fingerprint(steps: any[]): string {
  return JSON.stringify(steps);
}

export function getCheckpoint(modelId: string, stepsSlice: any[]): StepCheckpoint | null {
  if (!cache || cache.modelId !== modelId || cache.stepsFingerprint !== fingerprint(stepsSlice)) {
    return null;
  }
  return cache;
}

export function setCheckpoint(
  modelId: string,
  stepIndex: number,
  data: any[],
  schema: ColumnSchema[],
  columns: string[],
  stepsSlice: any[]
): void {
  cache = {
    modelId,
    stepIndex,
    data,
    schema,
    columns,
    stepsFingerprint: fingerprint(stepsSlice),
  };
}

export function invalidate(): void {
  cache = null;
}

export function invalidateForModel(modelId: string): void {
  if (cache?.modelId === modelId) {
    cache = null;
  }
}
