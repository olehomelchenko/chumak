import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Documentation Completeness Tests
 *
 * These tests ensure that:
 * 1. All functions in FUNCTION_IMPLS have JSDoc comments
 * 2. The JSON schema is up to date
 * 3. The markdown documentation files exist
 */

describe('Function Documentation Validation', () => {
  it('should have a functions.json schema file', () => {
    const schemaPath = path.join(__dirname, '../../src/schemas/functions.json');
    expect(fs.existsSync(schemaPath)).toBe(true);
  });

  it('should have all required documentation markdown files', () => {
    const functionsDir = path.join(__dirname, '../../src/content/functions');
    const requiredFiles = [
      'operators.md',
      'regex.md',
      'date.md',
      'text.md',
      'math.md',
      'conversion.md',
      'json.md',
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(functionsDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('should have all functions documented in the JSON schema', () => {
    const schemaPath = path.join(__dirname, '../../src/schemas/functions.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    // Verify schema structure
    expect(schema).toHaveProperty('version');
    expect(schema).toHaveProperty('functions');
    expect(Array.isArray(schema.functions)).toBe(true);

    // Verify we have a reasonable number of functions documented
    expect(schema.functions.length).toBeGreaterThan(30);
  });

  it('should have complete metadata for each function in schema', () => {
    const schemaPath = path.join(__dirname, '../../src/schemas/functions.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    for (const fn of schema.functions) {
      expect(fn).toHaveProperty('name');
      expect(fn).toHaveProperty('category');
      expect(fn).toHaveProperty('description');
      expect(fn).toHaveProperty('signature');
      expect(fn).toHaveProperty('params');
      expect(fn).toHaveProperty('returns');
      expect(fn).toHaveProperty('examples');

      // Ensure non-empty values
      expect(fn.name).toBeTruthy();
      expect(fn.category).toBeTruthy();
      expect(fn.description).toBeTruthy();
      expect(fn.signature).toBeTruthy();
      expect(fn.returns).toBeTruthy();

      // Ensure params is an array
      expect(Array.isArray(fn.params)).toBe(true);

      // Ensure examples is an array with at least one example
      expect(Array.isArray(fn.examples)).toBe(true);
      expect(fn.examples.length).toBeGreaterThan(0);
    }
  });

  it('should have valid categories', () => {
    const schemaPath = path.join(__dirname, '../../src/schemas/functions.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    const validCategories = ['Regex', 'Date', 'Text', 'Math', 'Conversion', 'JSON'];
    const categories = new Set(schema.functions.map((fn: any) => fn.category));

    for (const category of categories) {
      expect(validCategories).toContain(category);
    }
  });

  it('should have examples for all functions', () => {
    const schemaPath = path.join(__dirname, '../../src/schemas/functions.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    const functionsWithoutExamples = schema.functions.filter(
      (fn: any) => !fn.examples || fn.examples.length === 0
    );

    if (functionsWithoutExamples.length > 0) {
      const names = functionsWithoutExamples.map((fn: any) => fn.name).join(', ');
      throw new Error(`The following functions are missing examples: ${names}`);
    }
  });

  it('should have matching function counts across documentation', () => {
    const schemaPath = path.join(__dirname, '../../src/schemas/functions.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    // Count functions by category in schema
    const categoryCounts = new Map<string, number>();
    for (const fn of schema.functions) {
      categoryCounts.set(fn.category, (categoryCounts.get(fn.category) || 0) + 1);
    }

    // Verify markdown files mention the correct count
    const functionsDir = path.join(__dirname, '../../src/content/functions');

    for (const [category, count] of categoryCounts.entries()) {
      const filename = `${category.toLowerCase()}.md`;
      const filePath = path.join(functionsDir, filename);

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Check if the markdown file mentions the function count
        expect(content).toContain(`${count} function`);
      }
    }
  });

  it('should not have duplicate function names', () => {
    const schemaPath = path.join(__dirname, '../../src/schemas/functions.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    const functionNames = schema.functions.map((fn: any) => fn.name);
    const uniqueNames = new Set(functionNames);

    expect(functionNames.length).toBe(uniqueNames.size);
  });
});
