/**
 * CLI schema command — Inspect a data file's schema
 *
 * Usage: syto schema <file> [--json]
 */

import { readFileAsString, parseCSV } from './file-loader';
import { SchemaEngine } from '../core/schema-engine';

export interface SchemaOptions {
  file: string;
  json: boolean;
}

export function runSchemaCommand(options: SchemaOptions): void {
  const content = readFileAsString(options.file);
  const { data, columns } = parseCSV(content);

  const schema = SchemaEngine.createLogicalSchema(data);

  if (options.json) {
    process.stdout.write(JSON.stringify({ columns: schema }, null, 2) + '\n');
  } else {
    console.log(`File: ${options.file}`);
    console.log(`Rows: ${data.length}`);
    console.log(`Columns: ${columns.length}`);
    console.log('');
    console.log('Column'.padEnd(30) + 'Type');
    console.log('-'.repeat(30) + '-'.repeat(15));
    for (const col of schema) {
      console.log(col.name.padEnd(30) + col.type);
    }
  }
}
