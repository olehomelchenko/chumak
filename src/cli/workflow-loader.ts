/**
 * CLI Workflow Loader — Shared workflow file parsing and format validation
 */

import { validateV2Workflow, V2Workflow, ValidationError } from '../core/workflow-v2';
import { readFileAsString } from './file-loader';

export interface WorkflowLoadResult {
  workflow: V2Workflow | null;
  errors: ValidationError[];
}

/**
 * Reads, parses, and structurally validates a v2 workflow file.
 * Returns the workflow on success, or errors on failure.
 */
export function loadWorkflow(filePath: string): WorkflowLoadResult {
  let rawJson: any;
  try {
    const content = readFileAsString(filePath);
    rawJson = JSON.parse(content);
  } catch (error: any) {
    return {
      workflow: null,
      errors: [{ type: 'parse_error', message: `Failed to parse workflow: ${error.message}` }],
    };
  }

  if (rawJson.formatVersion !== 2) {
    return {
      workflow: null,
      errors: [
        {
          type: 'invalid_version',
          message: 'Unsupported workflow format. Expected formatVersion 2.',
        },
      ],
    };
  }

  const workflow = rawJson as V2Workflow;
  const validation = validateV2Workflow(workflow);
  if (!validation.valid) {
    return { workflow: null, errors: validation.errors };
  }

  return { workflow, errors: [] };
}
