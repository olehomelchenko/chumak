/**
 * CLI validate command — Validate a workflow without executing
 *
 * Usage: syto validate <workflow> [--bind name=file ...] [--json]
 */

import fs from 'fs';
import path from 'path';
import { ValidationError } from '../core/workflow-v2';
import { readFileAsString, parseCSV } from './file-loader';
import { loadWorkflow } from './workflow-loader';
import { SchemaEngine } from '../core/schema-engine';
import type { ColumnSchema } from '../core/schema-engine';

export interface ValidateOptions {
  workflowFile: string;
  bindings: Map<string, string>;
  json: boolean;
}

export function runValidateCommand(options: ValidateOptions): number {
  // Load and validate workflow (parse + format version + structural validation)
  const { workflow, errors: loadErrors } = loadWorkflow(options.workflowFile);
  if (!workflow) {
    outputErrors(loadErrors, options.json);
    return 2;
  }

  // Binding validation (only when bindings are provided via --bind or in-spec)
  const allErrors: ValidationError[] = [];
  const workflowDir = path.dirname(path.resolve(options.workflowFile));
  const hasAnyBindings = options.bindings.size > 0 || !!workflow.bindings;

  for (const sourceName of Object.keys(workflow.sources)) {
    const bindPath = options.bindings.get(sourceName) || workflow.bindings?.[sourceName];

    if (!bindPath) {
      // Only report missing bindings if user provided any bindings at all
      if (hasAnyBindings) {
        allErrors.push({
          type: 'missing_binding',
          source: sourceName,
          message: `Source "${sourceName}" has no binding. Use --bind ${sourceName}=<file>`,
        });
      }
      continue;
    }

    if (bindPath === '-') continue; // stdin binding

    const resolvedPath = path.resolve(workflowDir, bindPath);
    if (!fs.existsSync(resolvedPath)) {
      allErrors.push({
        type: 'file_not_found',
        source: sourceName,
        path: resolvedPath,
        message: `Binding file not found: ${resolvedPath}`,
      });
      continue;
    }

    // Schema validation: parse file and compare
    try {
      const content = readFileAsString(resolvedPath);
      const sourceDef = workflow.sources[sourceName];
      const { data, columns } = parseCSV(content, sourceDef.parsing);

      // Check for missing expected columns
      const expectedCols = sourceDef.columns.map((c) => c.name);
      for (const expected of expectedCols) {
        if (!columns.includes(expected)) {
          // Case-insensitive check
          const caseMatch = columns.find((c) => c.toLowerCase() === expected.toLowerCase());
          if (caseMatch) {
            allErrors.push({
              type: 'column_case_mismatch',
              source: sourceName,
              expected,
              actual: caseMatch,
              message: `Source "${sourceName}": column case mismatch — expected "${expected}", found "${caseMatch}"`,
            });
          } else {
            allErrors.push({
              type: 'missing_column',
              source: sourceName,
              column: expected,
              message: `Source "${sourceName}": expected column "${expected}" not found`,
            });
          }
        }
      }

      // Check type mismatches
      const actualSchema = SchemaEngine.createLogicalSchema(data);
      for (const expectedCol of sourceDef.columns) {
        const actualCol = actualSchema.find((c: ColumnSchema) => c.name === expectedCol.name);
        if (actualCol && actualCol.type !== expectedCol.type) {
          allErrors.push({
            type: 'type_mismatch',
            source: sourceName,
            column: expectedCol.name,
            expected: expectedCol.type,
            actual: actualCol.type,
            message: `Source "${sourceName}" column "${expectedCol.name}": expected ${expectedCol.type}, got ${actualCol.type}`,
          });
        }
      }

      // Check for delimiter mismatch
      if (columns.length === 1 && expectedCols.length > 1) {
        allErrors.push({
          type: 'delimiter_mismatch',
          source: sourceName,
          message: `Source "${sourceName}" expects ${expectedCols.length} columns but file has 1. The file may use a different delimiter (expected: "${sourceDef.parsing?.delimiter || ','}")`,
        });
      }
    } catch (error: any) {
      allErrors.push({
        type: 'parse_error',
        source: sourceName,
        message: `Failed to parse "${sourceName}": ${error.message}`,
      });
    }
  }

  if (allErrors.length > 0) {
    outputErrors(allErrors, options.json);
    return 3;
  }

  if (options.json) {
    process.stdout.write(JSON.stringify({ valid: true, errors: [] }) + '\n');
  } else {
    console.log('Workflow is valid.');
  }
  return 0;
}

function outputErrors(errors: ValidationError[], json: boolean): void {
  if (json) {
    process.stdout.write(JSON.stringify({ valid: false, errors }, null, 2) + '\n');
  } else {
    for (const error of errors) {
      console.error(`Error: ${error.message}`);
    }
  }
}
