import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { runValidateCommand, ValidateOptions } from './validate-command';
import { V2Workflow } from '../core/workflow-v2';

let consoleSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'syto-validate-'));
}

function writeFile(dir: string, name: string, content: string): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('validate-command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('returns 0 for a valid workflow', () => {
    const workflow: V2Workflow = {
      formatVersion: 2,
      sytoVersion: '0.1.0',
      exportedAt: new Date().toISOString(),
      sources: {
        data: { columns: [{ name: 'id', type: 'integer' }] },
      },
      models: {
        main: { source: 'data', steps: [] },
      },
      outputs: ['main'],
    };
    const workflowPath = writeFile(tempDir, 'workflow.json', JSON.stringify(workflow));

    const result = runValidateCommand({
      workflowFile: workflowPath,
      bindings: new Map(),
      json: false,
    });

    expect(result).toBe(0);
  });

  it('returns 2 for invalid JSON', () => {
    const workflowPath = writeFile(tempDir, 'bad.json', 'not json{');

    const result = runValidateCommand({
      workflowFile: workflowPath,
      bindings: new Map(),
      json: false,
    });

    expect(result).toBe(2);
  });

  it('returns 2 for structural errors', () => {
    const workflow = { formatVersion: 2 };
    const workflowPath = writeFile(tempDir, 'workflow.json', JSON.stringify(workflow));

    const result = runValidateCommand({
      workflowFile: workflowPath,
      bindings: new Map(),
      json: false,
    });

    expect(result).toBe(2);
  });

  it('returns 3 when binding file not found', () => {
    const workflow: V2Workflow = {
      formatVersion: 2,
      sytoVersion: '0.1.0',
      exportedAt: new Date().toISOString(),
      sources: {
        data: { columns: [{ name: 'id', type: 'integer' }] },
      },
      models: {
        main: { source: 'data', steps: [] },
      },
      outputs: ['main'],
    };
    const workflowPath = writeFile(tempDir, 'workflow.json', JSON.stringify(workflow));

    const result = runValidateCommand({
      workflowFile: workflowPath,
      bindings: new Map([['data', '/nonexistent/file.csv']]),
      json: false,
    });

    expect(result).toBe(3);
  });

  it('validates schema match when binding provided', () => {
    const workflow: V2Workflow = {
      formatVersion: 2,
      sytoVersion: '0.1.0',
      exportedAt: new Date().toISOString(),
      sources: {
        data: {
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'name', type: 'string' },
          ],
        },
      },
      models: {
        main: { source: 'data', steps: [] },
      },
      outputs: ['main'],
    };
    const workflowPath = writeFile(tempDir, 'workflow.json', JSON.stringify(workflow));
    const dataPath = writeFile(tempDir, 'data.csv', 'id,name\n1,Alice\n');

    const result = runValidateCommand({
      workflowFile: workflowPath,
      bindings: new Map([['data', dataPath]]),
      json: false,
    });

    expect(result).toBe(0);
  });

  it('outputs JSON when --json flag is set', () => {
    const workflow: V2Workflow = {
      formatVersion: 2,
      sytoVersion: '0.1.0',
      exportedAt: new Date().toISOString(),
      sources: {
        data: { columns: [{ name: 'id', type: 'integer' }] },
      },
      models: {
        main: { source: 'data', steps: [] },
      },
      outputs: ['main'],
    };
    const workflowPath = writeFile(tempDir, 'workflow.json', JSON.stringify(workflow));

    // Capture stdout
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    const result = runValidateCommand({
      workflowFile: workflowPath,
      bindings: new Map(),
      json: true,
    });

    expect(result).toBe(0);
    const output = stdoutSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.valid).toBe(true);
    expect(parsed.errors).toEqual([]);

    stdoutSpy.mockRestore();
  });

  it('detects missing columns in bound file', () => {
    const workflow: V2Workflow = {
      formatVersion: 2,
      sytoVersion: '0.1.0',
      exportedAt: new Date().toISOString(),
      sources: {
        data: {
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'missing_col', type: 'string' },
          ],
        },
      },
      models: {
        main: { source: 'data', steps: [] },
      },
      outputs: ['main'],
    };
    const workflowPath = writeFile(tempDir, 'workflow.json', JSON.stringify(workflow));
    const dataPath = writeFile(tempDir, 'data.csv', 'id\n1\n');

    const result = runValidateCommand({
      workflowFile: workflowPath,
      bindings: new Map([['data', dataPath]]),
      json: false,
    });

    expect(result).toBe(3);
  });
});
