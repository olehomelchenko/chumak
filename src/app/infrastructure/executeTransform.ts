/**
 * executeTransform — Simplified transform execution
 *
 * Assembles ExecutionCallbacks directly from store/handler imports,
 * bypassing the setTransformCallbacks() + createExecutionCallbacks()
 * indirection. Can be called from anywhere without callback wiring.
 */

import { AppStore } from '../stores/AppStore';
import { StepService, type ExecutionCallbacks } from '../services/StepService';
import type { TransformStep } from '../../core/schema-engine';
import { alert as showAlert } from '../handlers/core/notification-handlers';
import { closeDialog } from '../handlers/dialog/dialog-handlers';
import { updatePagination } from '../handlers/core/pagination-handlers';
import { clearPreview } from '../handlers/preview-engine';

export interface ExecuteTransformOptions {
  /** Whether to close the dialog after success. Default: true */
  closeDialog?: boolean;
}

/**
 * Execute a transform with sensible default UI callbacks.
 *
 * @example
 * ```ts
 * const fields = state.fields.value.filter(f => f.field !== '');
 * const sort = fields.length === 1 ? fields[0] : fields;
 * await executeTransform('Sort', { sort });
 * ```
 */
export async function executeTransform(
  label: string,
  transform: TransformStep,
  options?: ExecuteTransformOptions
): Promise<boolean> {
  const shouldCloseDialog = options?.closeDialog ?? true;

  const callbacks: ExecutionCallbacks = {
    async onTransformStart(msg: string) {
      AppStore.isTransforming.value = true;
      AppStore.transformMessage.value = msg;
      // Yield to render the loading indicator (matches AppController.startTransformation)
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      await new Promise((resolve) => setTimeout(resolve, 50));
    },

    onTransformEnd() {
      AppStore.isTransforming.value = false;
      AppStore.transformMessage.value = '';
    },

    async onError(message: string) {
      await showAlert(message);
    },

    onDialogClose(clearPrev?: boolean) {
      if (shouldCloseDialog) {
        if (clearPrev) clearPreview();
        closeDialog(true);
      }
    },

    updatePagination() {
      updatePagination();
    },
  };

  return StepService.runTransform(label, transform, callbacks, shouldCloseDialog);
}
