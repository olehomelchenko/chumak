import * as aq from 'arquero';
import { parseExpression } from '../../expression-parser';
import { validateAST } from '../../ast-validator';
import { interpretAST } from '../../ast-interpreter';
import type { FullTransformStep } from '../types';

export function handleDerive(table: any, transform: FullTransformStep, schema: string[]): any {
  const derivations = transform.derive!;
  let resultRows = table.objects();

  for (const [newCol, expression] of Object.entries(derivations)) {
    const ast = parseExpression(expression as string);
    const validation = validateAST(ast, schema);
    if (!validation.valid) {
      throw new Error(`Derive validation failed for '${newCol}': ${validation.error?.message}`);
    }

    resultRows = resultRows.map((row: any) => {
      try {
        const val = interpretAST(ast, row);
        return { ...row, [newCol]: val };
      } catch (error: any) {
        return { ...row, [newCol]: { type: 'error', message: error.message } };
      }
    });
  }

  return (aq as any).from(resultRows);
}

export const deriveHandlers = {
  derive: handleDerive,
};
