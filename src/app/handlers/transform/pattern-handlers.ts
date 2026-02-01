import { DialogStore } from '../../stores/DialogStore';
import { StepService } from '../../services/StepService';
import { validateRegexPattern } from '../validation-engine';

export async function applySelectPatternTransform(callbacks: any) {
  const { pattern, matchType, include } = DialogStore.selectPatternState;

  if (!pattern.value || pattern.value.trim() === '') {
    await callbacks.onError?.('Please enter a pattern');
    return;
  }

  // Validate regex if matchType is regex
  if (matchType.value === 'regex') {
    const validation = validateRegexPattern(pattern.value, {
      errorPrefix: 'Invalid regex pattern',
    });
    if (!validation.valid) {
      DialogStore.selectPatternState.error.value = validation.error;
      return;
    }
  }

  const transform = {
    selectPattern: {
      pattern: pattern.value.trim(),
      matchType: matchType.value,
      include: include.value.length > 0 ? include.value : undefined,
    },
  };

  DialogStore.selectPatternState.error.value = null;
  await StepService.runTransform('Select Pattern', transform, callbacks);
}

export async function applyRemovePatternTransform(callbacks: any) {
  const { pattern, matchType } = DialogStore.removePatternState;

  if (!pattern.value || pattern.value.trim() === '') {
    await callbacks.onError?.('Please enter a pattern');
    return;
  }

  // Validate regex if matchType is regex
  if (matchType.value === 'regex') {
    const validation = validateRegexPattern(pattern.value, {
      errorPrefix: 'Invalid regex pattern',
    });
    if (!validation.valid) {
      DialogStore.removePatternState.error.value = validation.error;
      return;
    }
  }

  const transform = {
    removePattern: {
      pattern: pattern.value.trim(),
      matchType: matchType.value,
    },
  };

  DialogStore.removePatternState.error.value = null;
  await StepService.runTransform('Remove Pattern', transform, callbacks);
}

export async function applyConditionalTransform(callbacks: any) {
  const { column, conditions, else: elseValue } = DialogStore.conditionalState;

  if (!column.value || column.value.trim() === '') {
    await callbacks.onError?.('Please enter a column name');
    return;
  }

  // Validate conditions
  const validConditions = conditions.value.filter((c) => c.when.trim() && c.then.trim());
  if (validConditions.length === 0) {
    await callbacks.onError?.('Please add at least one valid condition');
    return;
  }

  if (!elseValue.value || elseValue.value.trim() === '') {
    await callbacks.onError?.('Please enter an else value');
    return;
  }

  const transform = {
    conditional: {
      column: column.value.trim(),
      conditions: validConditions.map((c) => ({
        when: c.when.trim(),
        then: c.then.trim(),
      })),
      else: elseValue.value.trim(),
    },
  };

  DialogStore.conditionalState.error.value = null;
  await StepService.runTransform('Conditional', transform, callbacks);
}

export async function applyRenamePatternTransform(callbacks: any) {
  const { find, replace: replaceValue, regex } = DialogStore.renamePatternState;

  if (!find.value || find.value.trim() === '') {
    await callbacks.onError?.('Please enter a find pattern');
    return;
  }

  // Validate regex if enabled
  if (regex.value) {
    const validation = validateRegexPattern(find.value, { errorPrefix: 'Invalid regex pattern' });
    if (!validation.valid) {
      DialogStore.renamePatternState.error.value = validation.error;
      return;
    }
  }

  const transform = {
    renamePattern: {
      find: find.value.trim(),
      replace: replaceValue.value.trim(),
      regex: regex.value,
    },
  };

  DialogStore.renamePatternState.error.value = null;
  await StepService.runTransform('Rename Pattern', transform, callbacks);
}
