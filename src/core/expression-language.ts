/**
 * StreamLanguage tokenizer for the Syto expression syntax.
 * Used by ExpressionEditor to provide syntax highlighting and autocomplete.
 */

import { StreamLanguage, StringStream } from '@codemirror/language';
import { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { ALLOWED_FUNCTIONS } from './ast-validator';
import functionDocs from '../schemas/functions.json';

const FUNCTION_NAMES = new Set(Object.keys(ALLOWED_FUNCTIONS));
const KEYWORDS = new Set(['true', 'false', 'null']);
const OPERATOR_KEYWORDS = new Set(['and', 'or', 'not']);

interface ExpressionState {
  /** Columns available for highlighting */
  columns: Set<string>;
}

function tokenize(stream: StringStream, state: ExpressionState): string | null {
  // Skip whitespace
  if (stream.eatSpace()) return null;

  const ch = stream.peek();

  // Strings: "..." or '...'
  if (ch === '"' || ch === "'") {
    const quote = ch;
    stream.next();
    while (!stream.eol()) {
      const c = stream.next();
      if (c === '\\') {
        stream.next(); // skip escaped char
      } else if (c === quote) {
        return 'string';
      }
    }
    return 'string'; // unterminated string
  }

  // Bracketed column references: [column name]
  if (ch === '[') {
    stream.next();
    while (!stream.eol()) {
      if (stream.next() === ']') {
        return 'variableName special';
      }
    }
    return 'variableName special'; // unterminated bracket
  }

  // Numbers: 42, 3.14
  if (ch && /\d/.test(ch)) {
    stream.match(/^\d+(\.\d+)?/);
    return 'number';
  }

  // Multi-char operators
  if (stream.match('===') || stream.match('!==')) return 'operator';
  if (stream.match('==') || stream.match('!=')) return 'operator';
  if (stream.match('>=') || stream.match('<=')) return 'operator';
  if (stream.match('&&') || stream.match('||') || stream.match('??')) return 'operator';

  // Single-char operators and punctuation
  if (ch && '+-*/%><!'.includes(ch)) {
    stream.next();
    return 'operator';
  }

  if (ch && '(),.?:'.includes(ch)) {
    stream.next();
    return 'punctuation';
  }

  // Identifiers, keywords, functions, columns
  if (ch && /[a-zA-Z_]/.test(ch)) {
    stream.match(/^[a-zA-Z_]\w*/);
    const word = stream.current();

    // Check operator keywords first
    if (OPERATOR_KEYWORDS.has(word)) return 'operatorKeyword';

    // Check keywords
    if (KEYWORDS.has(word)) return 'keyword';

    // Check if followed by ( — if so, it's a function call
    if (stream.peek() === '(' && FUNCTION_NAMES.has(word)) return 'function definition';

    // Check if it's a known column
    if (state.columns.has(word)) return 'variableName';

    // Unknown identifier — could be a column not yet recognized
    return 'variableName';
  }

  // Skip unknown characters
  stream.next();
  return null;
}

/**
 * Creates a StreamLanguage instance for the expression syntax.
 * @param columns - Set of column names to highlight as variables
 */
export function createExpressionLanguage(columns: Set<string>) {
  return StreamLanguage.define<ExpressionState>({
    startState: () => ({ columns }),
    token: tokenize,
  });
}

// Build function completions from generated docs (single source of truth)
const functionDescriptionMap = new Map(functionDocs.functions.map((fn) => [fn.name, fn]));

function buildFunctionCompletions(): Completion[] {
  return Object.keys(ALLOWED_FUNCTIONS).map((name) => {
    const doc = functionDescriptionMap.get(name);
    return {
      label: name,
      type: 'function',
      detail: doc?.signature ?? name + '()',
      info: doc?.description,
      apply: name + '(',
      boost: 1,
    };
  });
}

const KEYWORD_COMPLETIONS: Completion[] = [
  { label: 'true', type: 'keyword' },
  { label: 'false', type: 'keyword' },
  { label: 'null', type: 'keyword' },
  { label: 'and', type: 'keyword', detail: 'logical AND (&&)' },
  { label: 'or', type: 'keyword', detail: 'logical OR (||)' },
  { label: 'not', type: 'keyword', detail: 'logical NOT (!)' },
];

const FUNCTION_COMPLETIONS = buildFunctionCompletions();

/**
 * Creates an autocomplete source for expression inputs.
 * Suggests column names, function names, and keywords.
 */
export function createExpressionCompletion(columns: string[]) {
  return (context: CompletionContext): CompletionResult | null => {
    // Match word characters at cursor position
    const word = context.matchBefore(/[\w]*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;

    const columnCompletions: Completion[] = columns.map((col) => ({
      label: col,
      type: 'variable',
      boost: 2, // prioritize columns
    }));

    return {
      from: word.from,
      options: [...columnCompletions, ...FUNCTION_COMPLETIONS, ...KEYWORD_COMPLETIONS],
      validFor: /^\w*$/,
    };
  };
}
