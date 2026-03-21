/**
 * Workflow Format v2 — Portable workflow specification
 *
 * Portable module (no browser APIs, no Preact). Used by both browser export
 * and CLI execution. See docs/future/WORKFLOW-FORMAT-V2.md for full spec.
 */

import { ColumnSchema, TransformStep } from './schema-engine';
import { MULTI_MODEL_REFERENCE_PATHS, KNOWN_TRANSFORM_KEYS } from './transforms/types';

// ── Types ──────────────────────────────────────────────────

export interface V2ParsingHints {
  format?: 'csv' | 'json' | 'excel';
  delimiter?: string;
  headerMode?: 'first-row' | 'auto-generate' | 'manual';
  encoding?: string;
  customHeaders?: string[];
  jsonPath?: string;
  sheet?: string | number;
}

export interface V2SourceDef {
  columns: ColumnSchema[];
  parsing?: V2ParsingHints;
}

export interface V2ModelDef {
  source: string;
  steps: TransformStep[];
}

export interface V2Workflow {
  formatVersion: 2;
  sytoVersion: string;
  exportedAt: string;
  sources: Record<string, V2SourceDef>;
  models: Record<string, V2ModelDef>;
  outputs: string[];
  bindings?: Record<string, string>;
}

export interface ValidationError {
  type: string;
  message: string;
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ── Validation ─────────────────────────────────────────────

export function validateV2Workflow(workflow: V2Workflow): ValidationResult {
  const errors: ValidationError[] = [];

  // Check formatVersion
  if (workflow.formatVersion !== 2) {
    errors.push({
      type: 'invalid_version',
      message: `Expected formatVersion 2, got ${workflow.formatVersion}`,
    });
  }

  // Check sources exist
  const sourceNames = Object.keys(workflow.sources || {});
  if (sourceNames.length === 0) {
    errors.push({
      type: 'no_sources',
      message: 'Workflow must have at least one source',
    });
  }

  // Check models exist
  const modelNames = Object.keys(workflow.models || {});
  if (modelNames.length === 0) {
    errors.push({
      type: 'no_models',
      message: 'Workflow must have at least one model',
    });
  }

  // Check outputs reference existing models
  const outputs = workflow.outputs || [];
  if (outputs.length === 0) {
    errors.push({
      type: 'no_outputs',
      message: 'Workflow must have at least one output',
    });
  }
  for (const output of outputs) {
    if (!modelNames.includes(output)) {
      errors.push({
        type: 'missing_output',
        model: output,
        message: `Output "${output}" does not reference an existing model`,
      });
    }
  }

  // Check model sources exist (either as source or model name)
  const allNames = new Set([...sourceNames, ...modelNames]);
  for (const [modelName, modelDef] of Object.entries(workflow.models || {})) {
    if (!allNames.has(modelDef.source)) {
      errors.push({
        type: 'missing_model_source',
        model: modelName,
        source: modelDef.source,
        message: `Model "${modelName}" references non-existent source/model "${modelDef.source}"`,
      });
    }

    // Check multi-model references in steps
    for (const step of modelDef.steps || []) {
      for (const { key, field } of MULTI_MODEL_REFERENCE_PATHS) {
        const stepValue = (step as any)[key];
        if (stepValue && stepValue[field]) {
          const ref = stepValue[field];
          if (!allNames.has(ref)) {
            errors.push({
              type: 'missing_reference',
              model: modelName,
              transform: key,
              reference: ref,
              message: `Model "${modelName}" step "${key}" references non-existent "${ref}"`,
            });
          }
        }
      }

      // Check for known transform keys
      const stepKeys = Object.keys(step).filter((k) => k !== 'import');
      for (const key of stepKeys) {
        if (!KNOWN_TRANSFORM_KEYS.includes(key)) {
          errors.push({
            type: 'unknown_transform',
            model: modelName,
            transform: key,
            message: `Model "${modelName}" has unknown transform "${key}"`,
          });
        }
      }
    }
  }

  // Check for cycles in model DAG
  if (hasCycle(workflow)) {
    errors.push({
      type: 'circular_dependency',
      message: 'Workflow has a circular dependency between models',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Detects cycles in the model dependency graph.
 */
function hasCycle(workflow: V2Workflow): boolean {
  const modelNames = Object.keys(workflow.models || {});
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;

  const colors = new Map<string, number>();
  for (const name of modelNames) {
    colors.set(name, WHITE);
  }

  const getDeps = (name: string): string[] => {
    const model = workflow.models[name];
    if (!model) return [];
    const deps: string[] = [];
    // Source reference (only if it's a model, not a raw source)
    if (modelNames.includes(model.source)) {
      deps.push(model.source);
    }
    // Step references
    for (const step of model.steps || []) {
      for (const { key, field } of MULTI_MODEL_REFERENCE_PATHS) {
        const stepValue = (step as any)[key];
        if (stepValue && stepValue[field] && modelNames.includes(stepValue[field])) {
          deps.push(stepValue[field]);
        }
      }
    }
    return deps;
  };

  const visit = (name: string): boolean => {
    colors.set(name, GRAY);
    for (const dep of getDeps(name)) {
      const color = colors.get(dep);
      if (color === GRAY) return true;
      if (color === WHITE && visit(dep)) return true;
    }
    colors.set(name, BLACK);
    return false;
  };

  for (const name of modelNames) {
    if (colors.get(name) === WHITE && visit(name)) {
      return true;
    }
  }

  return false;
}

// ── Name Translation ───────────────────────────────────────

/**
 * Rewrites multi-model references in steps from IDs to names.
 * Also handles the model's source field outside of steps.
 */
export function translateIdsToNames(
  steps: TransformStep[],
  idToName: Map<string, string>
): TransformStep[] {
  return steps.map((step) => {
    const cloned = JSON.parse(JSON.stringify(step)) as any;

    for (const { key, field } of MULTI_MODEL_REFERENCE_PATHS) {
      if (cloned[key] && cloned[key][field]) {
        const name = idToName.get(cloned[key][field]);
        if (name) {
          cloned[key][field] = name;
        }
      }
    }

    return cloned as TransformStep;
  });
}

/**
 * Rewrites multi-model references in steps from names to IDs.
 */
export function translateNamesToIds(
  steps: TransformStep[],
  nameToId: Map<string, string>
): TransformStep[] {
  return steps.map((step) => {
    const cloned = JSON.parse(JSON.stringify(step)) as any;

    for (const { key, field } of MULTI_MODEL_REFERENCE_PATHS) {
      if (cloned[key] && cloned[key][field]) {
        const id = nameToId.get(cloned[key][field]);
        if (id) {
          cloned[key][field] = id;
        }
      }
    }

    return cloned as TransformStep;
  });
}

// ── Topological Sort ──────────────────────────────────────

/**
 * Gets all model names reachable from the output set (upstream walk).
 */
export function getReachableModels(workflow: V2Workflow, outputs: string[]): Set<string> {
  const visited = new Set<string>();
  const queue = [...outputs];

  while (queue.length > 0) {
    const name = queue.shift()!;
    if (visited.has(name)) continue;
    if (!workflow.models[name]) continue;
    visited.add(name);

    const model = workflow.models[name];
    if (workflow.models[model.source]) {
      queue.push(model.source);
    }
    for (const step of model.steps || []) {
      for (const { key, field } of MULTI_MODEL_REFERENCE_PATHS) {
        const stepValue = (step as any)[key];
        if (stepValue && stepValue[field] && workflow.models[stepValue[field]]) {
          queue.push(stepValue[field]);
        }
      }
    }
  }

  return visited;
}

/**
 * Returns a topological ordering of the reachable models (dependency-first).
 */
export function topologicalSortV2(workflow: V2Workflow, reachable: Set<string>): string[] {
  const visited = new Set<string>();
  const result: string[] = [];
  const modelNames = new Set(Object.keys(workflow.models));

  const visit = (name: string) => {
    if (visited.has(name) || !reachable.has(name)) return;
    visited.add(name);

    const model = workflow.models[name];
    if (!model) return;

    if (modelNames.has(model.source)) {
      visit(model.source);
    }
    for (const step of model.steps || []) {
      for (const { key, field } of MULTI_MODEL_REFERENCE_PATHS) {
        const stepValue = (step as any)[key];
        if (stepValue && stepValue[field] && modelNames.has(stepValue[field])) {
          visit(stepValue[field]);
        }
      }
    }

    result.push(name);
  };

  for (const name of reachable) {
    visit(name);
  }

  return result;
}
