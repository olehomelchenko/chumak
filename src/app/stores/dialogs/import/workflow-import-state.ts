import { signal } from '@preact/signals';
import { registerResetFunction } from '../reset-registry';
import type { V2Workflow } from '../../../../core/workflow-v2';

export interface WorkflowSourceBinding {
  file: File | null;
  data: any[] | null;
  columns: string[] | null;
  error: string | null;
}

export const workflowImportState = {
  workflow: signal<V2Workflow | null>(null),
  sourceNames: signal<string[]>([]),
  bindings: signal<Map<string, WorkflowSourceBinding>>(new Map()),
  validationErrors: signal<string[]>([]),
  isProcessing: signal(false),
};

export function resetWorkflowImportState() {
  workflowImportState.workflow.value = null;
  workflowImportState.sourceNames.value = [];
  workflowImportState.bindings.value = new Map();
  workflowImportState.validationErrors.value = [];
  workflowImportState.isProcessing.value = false;
}

registerResetFunction(resetWorkflowImportState);
