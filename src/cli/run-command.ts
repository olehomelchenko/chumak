/**
 * CLI run command — Execute a workflow with bound data files
 *
 * Usage: syto run <workflow> [--bind name=file ...] [--output path] [--json] [--strict]
 */

import * as aq from 'arquero';
import fs from 'fs';
import path from 'path';
import {
  validateV2Workflow,
  V2Workflow,
  getReachableModels,
  topologicalSortV2,
} from '../core/workflow-v2';
import { applyTransform } from '../core/transforms';
import { TransformResult } from '../core/transform-result';
import { SchemaEngine, ColumnSchema } from '../core/schema-engine';
import { readFileAsString, parseCSV, resolvePath, readFromStdin } from './file-loader';
import { writeCSV, writeJSON } from './output-writer';

export interface RunOptions {
  workflowFile: string;
  bindings: Map<string, string>;
  output: string | null;
  json: boolean;
  strict: boolean;
}

interface ExecutionContext {
  /** Source name → parsed data */
  sourceData: Map<string, any[]>;
  /** Model name → computed output data */
  modelData: Map<string, any[]>;
  /** Model name → computed schema */
  modelSchema: Map<string, ColumnSchema[]>;
}

export async function runRunCommand(options: RunOptions): Promise<number> {
  // 1. Read and parse workflow
  let rawJson: any;
  try {
    const content = readFileAsString(options.workflowFile);
    rawJson = JSON.parse(content);
  } catch (error: any) {
    console.error(`Error: Failed to parse workflow: ${error.message}`);
    return 1;
  }

  // 2. Validate format version
  if (rawJson.formatVersion !== 2) {
    console.error('Error: Unsupported workflow format. Expected formatVersion 2.');
    return 2;
  }
  const workflow: V2Workflow = rawJson as V2Workflow;

  // 3. Validate structure
  const validation = validateV2Workflow(workflow);
  if (!validation.valid) {
    for (const error of validation.errors) {
      console.error(`Validation error: ${error.message}`);
    }
    return 2;
  }

  // 4. Resolve bindings
  const workflowDir = path.dirname(path.resolve(options.workflowFile));
  const sourceNames = Object.keys(workflow.sources);
  const resolvedBindings = new Map<string, string>();

  for (const name of sourceNames) {
    const binding = options.bindings.get(name) || workflow.bindings?.[name];

    if (binding) {
      resolvedBindings.set(name, binding);
    }
  }

  // Auto-bind stdin for single-source workflows
  const hasStdin = !process.stdin.isTTY;
  if (sourceNames.length === 1 && !resolvedBindings.has(sourceNames[0]) && hasStdin) {
    resolvedBindings.set(sourceNames[0], '-');
  }

  // 5. Check all sources are bound
  const unbound = sourceNames.filter((name) => !resolvedBindings.has(name));
  if (unbound.length > 0) {
    for (const name of unbound) {
      console.error(`Error: Source "${name}" has no binding. Use --bind ${name}=<file>`);
    }
    return 3;
  }

  // 6. Parse source files
  const context: ExecutionContext = {
    sourceData: new Map(),
    modelData: new Map(),
    modelSchema: new Map(),
  };

  for (const [name, binding] of resolvedBindings) {
    try {
      let content: string;
      if (binding === '-') {
        content = await readFromStdin();
      } else {
        const filePath = resolvePath(workflowDir, binding);
        if (!fs.existsSync(filePath)) {
          console.error(`Error: File not found: ${filePath}`);
          return 3;
        }
        const encoding = (workflow.sources[name]?.parsing?.encoding || 'utf-8') as BufferEncoding;
        content = readFileAsString(filePath, encoding);
      }

      const sourceDef = workflow.sources[name];
      const { data, columns } = parseCSV(content, sourceDef.parsing);

      // Schema validation warnings
      const expectedCols = sourceDef.columns.map((c) => c.name);
      const missing = expectedCols.filter((c) => !columns.includes(c));
      if (missing.length > 0) {
        const msg = `Warning: Source "${name}" missing expected columns: ${missing.join(', ')}`;
        if (options.strict) {
          console.error(`Error: ${msg}`);
          return 3;
        }
        console.error(msg);
      }

      // Delimiter mismatch check
      if (columns.length === 1 && expectedCols.length > 1) {
        const msg = `Warning: Source "${name}" expects ${expectedCols.length} columns but file has 1. Check delimiter.`;
        if (options.strict) {
          console.error(`Error: ${msg}`);
          return 3;
        }
        console.error(msg);
      }

      context.sourceData.set(name, data);
    } catch (error: any) {
      console.error(`Error: Failed to load source "${name}": ${error.message}`);
      return 3;
    }
  }

  // 7. Topological sort: determine execution order for models reachable from outputs
  const reachable = getReachableModels(workflow, workflow.outputs);
  const executionOrder = topologicalSortV2(workflow, reachable);

  // 8. Execute models in order
  for (const modelName of executionOrder) {
    const modelDef = workflow.models[modelName];
    if (!modelDef) continue;

    try {
      // Resolve input data (from source or parent model)
      let inputData: any[];
      let inputSchema: ColumnSchema[];

      if (context.sourceData.has(modelDef.source)) {
        inputData = context.sourceData.get(modelDef.source)!;
        inputSchema = SchemaEngine.createLogicalSchema(inputData);
      } else if (context.modelData.has(modelDef.source)) {
        inputData = context.modelData.get(modelDef.source)!;
        inputSchema =
          context.modelSchema.get(modelDef.source) || SchemaEngine.createLogicalSchema(inputData);
      } else {
        console.error(`Error: Input "${modelDef.source}" not found for model "${modelName}"`);
        return 4;
      }

      // Build transform context for multi-model operations
      const transformContext = buildTransformContext(context);

      // Execute pipeline
      let table = aq.from(inputData);
      let schema = JSON.parse(JSON.stringify(inputSchema)) as ColumnSchema[];
      let columns = schema.map((c) => c.name);

      for (let i = 0; i < modelDef.steps.length; i++) {
        const step = modelDef.steps[i];
        if ((step as any).import) continue;

        try {
          table = applyTransform(table, step, columns, transformContext);
          const stepResult = TransformResult.create(table, schema, step);
          schema = stepResult.schema;
          columns = stepResult.columns;
        } catch (error: any) {
          console.error(`Error: Model "${modelName}" step ${i + 1} failed: ${error.message}`);
          return 4;
        }
      }

      const outputData = table.objects() as any[];
      context.modelData.set(modelName, outputData);
      context.modelSchema.set(modelName, schema);
    } catch (error: any) {
      console.error(`Error: Failed to compute model "${modelName}": ${error.message}`);
      return 4;
    }
  }

  // 9. Output results
  for (const outputName of workflow.outputs) {
    const data = context.modelData.get(outputName);
    if (!data) {
      console.error(`Error: Output model "${outputName}" produced no data`);
      return 4;
    }

    let outputPath: string | null = null;
    if (options.output) {
      if (workflow.outputs.length > 1) {
        // Multiple outputs: write to directory
        const ext = options.json ? '.json' : '.csv';
        outputPath = path.join(options.output, `${outputName}${ext}`);
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      } else {
        outputPath = options.output;
      }
    }

    if (options.json) {
      writeJSON(data, outputPath);
    } else {
      writeCSV(data, outputPath);
    }
  }

  return 0;
}

/**
 * Builds a TransformContext (sources + models arrays) from the execution context.
 * Maps names back to objects with { id, data } structure for applyTransform compatibility.
 */
function buildTransformContext(ctx: ExecutionContext): {
  sources: Array<{ id: string; data: any[] }>;
  models: Array<{ id: string; data: any[] }>;
} {
  const sources = Array.from(ctx.sourceData.entries()).map(([name, data]) => ({
    id: name,
    data,
  }));
  const models = Array.from(ctx.modelData.entries()).map(([name, data]) => ({
    id: name,
    data,
  }));
  return { sources, models };
}
