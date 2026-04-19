#!/usr/bin/env tsx
/**
 * Documentation Generator
 * Extracts function metadata from ast-interpreter.ts JSDoc comments
 * and generates both markdown documentation and JSON schema.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FunctionParam {
  name: string;
  description: string;
}

interface FunctionExample {
  expression: string;
  result?: string;
}

interface FunctionMetadata {
  name: string;
  category: string;
  description: string;
  params: FunctionParam[];
  returns: string;
  examples: FunctionExample[];
}

interface OperatorMetadata {
  operator: string;
  category: string;
  description: string;
  example: string;
}

// Parse JSDoc comment block
function parseJSDoc(comment: string): Partial<FunctionMetadata> {
  const lines = comment.split('\n').map((line) => line.trim().replace(/^\*\s?/, ''));

  const metadata: Partial<FunctionMetadata> = {
    params: [],
    examples: [],
  };

  for (const line of lines) {
    if (line.startsWith('@name ')) {
      metadata.name = line.replace('@name ', '').trim();
    } else if (line.startsWith('@category ')) {
      metadata.category = line.replace('@category ', '').trim();
    } else if (line.startsWith('@description ')) {
      metadata.description = line.replace('@description ', '').trim();
    } else if (line.startsWith('@param ')) {
      const match = line.match(/@param\s+(\w+)\s+-\s+(.+)/);
      if (match) {
        metadata.params!.push({
          name: match[1],
          description: match[2],
        });
      }
    } else if (line.startsWith('@returns ')) {
      metadata.returns = line.replace('@returns ', '').trim();
    } else if (line.startsWith('@example ')) {
      const example = line.replace('@example ', '').trim();
      const arrowMatch = example.match(/(.+)\s+→\s+(.+)/);
      if (arrowMatch) {
        metadata.examples!.push({
          expression: arrowMatch[1].trim(),
          result: arrowMatch[2].trim(),
        });
      } else {
        metadata.examples!.push({ expression: example });
      }
    }
  }

  return metadata;
}

// Extract functions from source file
function extractFunctions(sourceCode: string): FunctionMetadata[] {
  const functions: FunctionMetadata[] = [];

  // Match function declarations with JSDoc
  // Supports both old format (name: () =>) and new format (export const name = () =>)
  // Note: (?::[^=]*)? handles compound return types like `: string | null`
  const functionRegex =
    /\/\*\*\s*([\s\S]*?)\s*\*\/\s*(?:export\s+)?(?:const\s+)?(\w+)(?::\s*|\s*=\s*)\(([^)]*)\)\s*(?::[^=]*)?\s*=>/g;

  let match;
  while ((match = functionRegex.exec(sourceCode)) !== null) {
    const [, jsdocComment, functionName] = match;

    const metadata = parseJSDoc(jsdocComment);

    if (metadata.category && metadata.description) {
      functions.push({
        name: metadata.name || functionName,
        category: metadata.category,
        description: metadata.description,
        params: metadata.params || [],
        returns: metadata.returns || '',
        examples: metadata.examples || [],
      });
    }
  }

  return functions;
}

// Generate markdown for a category
function generateCategoryMarkdown(category: string, functions: FunctionMetadata[]): string {
  const lines: string[] = [];

  lines.push(`# ${category} Functions\n`);
  lines.push(`${functions.length} function${functions.length !== 1 ? 's' : ''} available\n`);

  for (const fn of functions) {
    lines.push(`## ${fn.name}\n`);
    lines.push(`${fn.description}\n`);

    if (fn.params.length > 0) {
      lines.push(`**Parameters:**\n`);
      for (const param of fn.params) {
        lines.push(`- \`${param.name}\` — ${param.description}`);
      }
      lines.push('');
    }

    if (fn.returns) {
      lines.push(`**Returns:** ${fn.returns}\n`);
    }

    if (fn.examples.length > 0) {
      lines.push(`**Examples:**\n`);
      lines.push('```');
      for (const example of fn.examples) {
        if (example.result) {
          lines.push(`${example.expression} → ${example.result}`);
        } else {
          lines.push(example.expression);
        }
      }
      lines.push('```\n');
    }

    lines.push('---\n');
  }

  return lines.join('\n');
}

// Generate operators documentation
function generateOperatorsMarkdown(): string {
  const operators: OperatorMetadata[] = [
    // Arithmetic
    {
      operator: '+',
      category: 'Arithmetic',
      description: 'Addition',
      example: 'price + tax',
    },
    {
      operator: '-',
      category: 'Arithmetic',
      description: 'Subtraction',
      example: 'revenue - cost',
    },
    {
      operator: '*',
      category: 'Arithmetic',
      description: 'Multiplication',
      example: 'price * quantity',
    },
    {
      operator: '/',
      category: 'Arithmetic',
      description: 'Division',
      example: 'total / count',
    },
    {
      operator: '%',
      category: 'Arithmetic',
      description: 'Modulo (remainder)',
      example: 'id % 2',
    },
    // Comparison
    {
      operator: '>',
      category: 'Comparison',
      description: 'Greater than',
      example: 'sales > 1000',
    },
    {
      operator: '<',
      category: 'Comparison',
      description: 'Less than',
      example: 'age < 18',
    },
    {
      operator: '>=',
      category: 'Comparison',
      description: 'Greater than or equal',
      example: 'score >= 90',
    },
    {
      operator: '<=',
      category: 'Comparison',
      description: 'Less than or equal',
      example: 'price <= 100',
    },
    {
      operator: '==',
      category: 'Comparison',
      description: 'Equal',
      example: 'status == "active"',
    },
    {
      operator: '!=',
      category: 'Comparison',
      description: 'Not equal',
      example: 'region != "Unknown"',
    },
    // Logical
    {
      operator: 'and',
      category: 'Logical',
      description: 'Logical AND',
      example: 'sales > 1000 and region == "North"',
    },
    {
      operator: 'or',
      category: 'Logical',
      description: 'Logical OR',
      example: 'status == "pending" or status == "review"',
    },
    {
      operator: 'not',
      category: 'Logical',
      description: 'Logical NOT',
      example: 'not is_deleted',
    },
    // Special
    {
      operator: '? :',
      category: 'Special',
      description: 'Conditional (ternary)',
      example: 'profit > 0 ? "Gain" : "Loss"',
    },
    {
      operator: '??',
      category: 'Special',
      description: 'Null/error coalescing',
      example: 'discount ?? 0',
    },
  ];

  const lines: string[] = [];
  lines.push('# Operators\n');

  const categories = ['Arithmetic', 'Comparison', 'Logical', 'Special'];

  for (const category of categories) {
    const ops = operators.filter((op) => op.category === category);
    lines.push(`## ${category}\n`);
    lines.push('| Operator | Description | Example |');
    lines.push('| -------- | ----------- | ------- |');
    for (const op of ops) {
      lines.push(`| \`${op.operator}\` | ${op.description} | \`${op.example}\` |`);
    }
    lines.push('');
  }

  lines.push(
    '**Note on `??`:** The null coalescing operator treats both `null` and conversion errors as "missing". For example, `price ?? 0` returns `0` when `price` is null OR contains a conversion error.\n'
  );

  lines.push('## Error propagation\n');
  lines.push(
    'Conversion errors propagate through arithmetic, comparison, and logical operators. If either operand is an error, the result is an error. Use `is_error(value)` to detect errors, `??` or `coalesce()` to provide fallbacks.\n'
  );

  lines.push('## See also\n');
  lines.push(
    '- **Let bindings** (`let x = ... in ...`) — name an intermediate value and reuse it inside the same expression. See the "Let bindings" page.\n'
  );

  return lines.join('\n');
}

// Generate JSON schema
function generateJSONSchema(functions: FunctionMetadata[]): any {
  return {
    version: '1.0.0',
    functions: functions.map((fn) => ({
      name: fn.name,
      category: fn.category,
      description: fn.description,
      signature: `${fn.name}(${fn.params.map((p) => p.name).join(', ')})`,
      params: fn.params.map((p) => ({
        name: p.name,
        description: p.description,
      })),
      returns: fn.returns,
      examples: fn.examples,
    })),
  };
}

// Main execution
function main() {
  const functionsDir = path.join(__dirname, '../src/core/functions');
  const outputDir = path.join(__dirname, '../src/content/functions');
  const schemaDir = path.join(__dirname, '../src/schemas');

  // Read all function files from the functions directory
  const functionFiles = fs.readdirSync(functionsDir).filter((f) => f.endsWith('.ts'));
  let allSourceCode = '';
  for (const file of functionFiles) {
    allSourceCode += fs.readFileSync(path.join(functionsDir, file), 'utf-8') + '\n';
  }

  // Extract functions from all source files
  const allFunctions = extractFunctions(allSourceCode);

  console.log(`✓ Extracted ${allFunctions.length} functions`);

  // Group by category
  const categories = new Map<string, FunctionMetadata[]>();
  for (const fn of allFunctions) {
    if (!categories.has(fn.category)) {
      categories.set(fn.category, []);
    }
    categories.get(fn.category)!.push(fn);
  }

  // Create output directories
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(schemaDir)) {
    fs.mkdirSync(schemaDir, { recursive: true });
  }

  // Generate markdown files for each category
  for (const [category, functions] of categories) {
    const markdown = generateCategoryMarkdown(category, functions);
    const filename = `${category.toLowerCase()}.md`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, markdown);
    console.log(`✓ Generated ${filename} (${functions.length} functions)`);
  }

  // Generate operators markdown
  const operatorsMarkdown = generateOperatorsMarkdown();
  fs.writeFileSync(path.join(outputDir, 'operators.md'), operatorsMarkdown);
  console.log('✓ Generated operators.md');

  // Generate JSON schema
  const schema = generateJSONSchema(allFunctions);
  const schemaPath = path.join(schemaDir, 'functions.json');
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + '\n');
  console.log(`✓ Generated functions.json schema (${allFunctions.length} functions)`);

  console.log('\n✅ Documentation generation complete!');
}

main();
