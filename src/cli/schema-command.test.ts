import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { runSchemaCommand } from './schema-command';

let consoleSpy: ReturnType<typeof vi.spyOn>;

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'syto-schema-'));
}

function writeFile(dir: string, name: string, content: string): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('schema-command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
  });

  it('infers schema from a CSV file', () => {
    const dataPath = writeFile(tempDir, 'data.csv', 'id,name,age\n1,Alice,30\n2,Bob,25\n');

    runSchemaCommand({ file: dataPath, json: false });

    // Should have printed column information
    const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
    expect(output).toContain('Rows: 2');
    expect(output).toContain('Columns: 3');
    expect(output).toContain('id');
    expect(output).toContain('name');
    expect(output).toContain('age');
  });

  it('outputs JSON schema when --json flag is set', () => {
    const dataPath = writeFile(tempDir, 'data.csv', 'id,value\n1,100\n2,200\n');

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    runSchemaCommand({ file: dataPath, json: true });

    const output = stdoutSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.columns).toBeDefined();
    expect(parsed.columns.length).toBe(2);
    expect(parsed.columns[0].name).toBe('id');

    stdoutSpy.mockRestore();
  });

  it('throws for nonexistent file', () => {
    expect(() => {
      runSchemaCommand({ file: '/nonexistent/file.csv', json: false });
    }).toThrow();
  });
});
