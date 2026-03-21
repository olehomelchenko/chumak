import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { runRunCommand, RunOptions } from './run-command';
import { V2Workflow } from '../core/workflow-v2';

// Suppress console output during tests
let consoleSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'syto-test-'));
}

function writeFile(dir: string, name: string, content: string): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function createSimpleWorkflow(): V2Workflow {
  return {
    formatVersion: 2,
    sytoVersion: '0.1.0',
    exportedAt: new Date().toISOString(),
    sources: {
      orders: {
        columns: [
          { name: 'id', type: 'integer' },
          { name: 'amount', type: 'float' },
        ],
      },
    },
    models: {
      main: {
        source: 'orders',
        steps: [{ filter: 'amount > 100' }],
      },
    },
    outputs: ['main'],
  };
}

describe('run-command', () => {
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

  it('executes a simple single-source workflow', async () => {
    const workflow = createSimpleWorkflow();
    const workflowPath = writeFile(tempDir, 'workflow.json', JSON.stringify(workflow));
    const dataPath = writeFile(tempDir, 'orders.csv', 'id,amount\n1,50\n2,200\n3,150\n');
    const outputPath = path.join(tempDir, 'output.csv');

    const options: RunOptions = {
      workflowFile: workflowPath,
      bindings: new Map([['orders', dataPath]]),
      output: outputPath,
      json: false,
      strict: false,
    };

    const exitCode = await runRunCommand(options);
    expect(exitCode).toBe(0);

    const output = fs.readFileSync(outputPath, 'utf-8');
    expect(output).toContain('200');
    expect(output).toContain('150');
    expect(output).not.toContain(',50\n');
  });

  it('executes a workflow with JSON output', async () => {
    const workflow = createSimpleWorkflow();
    const workflowPath = writeFile(tempDir, 'workflow.json', JSON.stringify(workflow));
    const dataPath = writeFile(tempDir, 'orders.csv', 'id,amount\n1,200\n');
    const outputPath = path.join(tempDir, 'output.json');

    const options: RunOptions = {
      workflowFile: workflowPath,
      bindings: new Map([['orders', dataPath]]),
      output: outputPath,
      json: true,
      strict: false,
    };

    const exitCode = await runRunCommand(options);
    expect(exitCode).toBe(0);

    const output = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    expect(output).toHaveLength(1);
    expect(output[0].amount).toBe(200);
  });

  it('returns exit code 2 for invalid workflow', async () => {
    const workflowPath = writeFile(tempDir, 'workflow.json', '{"formatVersion": 2}');

    const options: RunOptions = {
      workflowFile: workflowPath,
      bindings: new Map(),
      output: null,
      json: false,
      strict: false,
    };

    const exitCode = await runRunCommand(options);
    expect(exitCode).toBe(2);
  });

  it('returns exit code 3 for missing bindings', async () => {
    const workflow = createSimpleWorkflow();
    const workflowPath = writeFile(tempDir, 'workflow.json', JSON.stringify(workflow));

    // stdin is a TTY in tests, so no auto-binding
    const originalIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;

    const options: RunOptions = {
      workflowFile: workflowPath,
      bindings: new Map(),
      output: null,
      json: false,
      strict: false,
    };

    const exitCode = await runRunCommand(options);
    expect(exitCode).toBe(3);

    process.stdin.isTTY = originalIsTTY;
  });

  it('returns exit code 1 for unparseable workflow file', async () => {
    const workflowPath = writeFile(tempDir, 'workflow.json', 'not valid json{{{');

    const options: RunOptions = {
      workflowFile: workflowPath,
      bindings: new Map(),
      output: null,
      json: false,
      strict: false,
    };

    const exitCode = await runRunCommand(options);
    expect(exitCode).toBe(1);
  });

  it('executes a multi-model join workflow', async () => {
    const workflow: V2Workflow = {
      formatVersion: 2,
      sytoVersion: '0.1.0',
      exportedAt: new Date().toISOString(),
      sources: {
        orders: {
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'customer_id', type: 'integer' },
            { name: 'amount', type: 'float' },
          ],
        },
        customers: {
          columns: [
            { name: 'customer_id', type: 'integer' },
            { name: 'name', type: 'string' },
          ],
        },
      },
      models: {
        'clean-orders': {
          source: 'orders',
          steps: [],
        },
        'clean-customers': {
          source: 'customers',
          steps: [],
        },
        report: {
          source: 'clean-orders',
          steps: [
            {
              join: {
                right: 'clean-customers',
                on: [['customer_id', 'customer_id']],
                how: 'left',
              },
            },
          ],
        },
      },
      outputs: ['report'],
    };

    const workflowPath = writeFile(tempDir, 'workflow.json', JSON.stringify(workflow));
    const ordersPath = writeFile(tempDir, 'orders.csv', 'id,customer_id,amount\n1,10,200\n');
    const customersPath = writeFile(tempDir, 'customers.csv', 'customer_id,name\n10,Alice\n');
    const outputPath = path.join(tempDir, 'output.json');

    const options: RunOptions = {
      workflowFile: workflowPath,
      bindings: new Map([
        ['orders', ordersPath],
        ['customers', customersPath],
      ]),
      output: outputPath,
      json: true,
      strict: false,
    };

    const exitCode = await runRunCommand(options);
    expect(exitCode).toBe(0);

    const output = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    expect(output).toHaveLength(1);
    expect(output[0].name).toBe('Alice');
    expect(output[0].amount).toBe(200);
  });

  it('executes a chained model workflow', async () => {
    const workflow: V2Workflow = {
      formatVersion: 2,
      sytoVersion: '0.1.0',
      exportedAt: new Date().toISOString(),
      sources: {
        data: {
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'value', type: 'float' },
          ],
        },
      },
      models: {
        step1: {
          source: 'data',
          steps: [{ filter: 'value > 10' }],
        },
        step2: {
          source: 'step1',
          steps: [{ derive: { doubled: 'value * 2' } }],
        },
      },
      outputs: ['step2'],
    };

    const workflowPath = writeFile(tempDir, 'workflow.json', JSON.stringify(workflow));
    const dataPath = writeFile(tempDir, 'data.csv', 'id,value\n1,5\n2,20\n3,15\n');
    const outputPath = path.join(tempDir, 'output.json');

    const options: RunOptions = {
      workflowFile: workflowPath,
      bindings: new Map([['data', dataPath]]),
      output: outputPath,
      json: true,
      strict: false,
    };

    const exitCode = await runRunCommand(options);
    expect(exitCode).toBe(0);

    const output = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    // Only rows with value > 10 should remain
    expect(output).toHaveLength(2);
    // All rows should have doubled column
    expect(output[0].doubled).toBe(40);
    expect(output[1].doubled).toBe(30);
  });

  it('uses in-spec bindings when --bind not provided', async () => {
    const dataPath = writeFile(tempDir, 'orders.csv', 'id,amount\n1,200\n');
    const workflow: V2Workflow = {
      ...createSimpleWorkflow(),
      bindings: { orders: 'orders.csv' },
    };
    const workflowPath = writeFile(tempDir, 'workflow.json', JSON.stringify(workflow));
    const outputPath = path.join(tempDir, 'output.json');

    // stdin is a TTY
    const originalIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;

    const options: RunOptions = {
      workflowFile: workflowPath,
      bindings: new Map(),
      output: outputPath,
      json: true,
      strict: false,
    };

    const exitCode = await runRunCommand(options);
    expect(exitCode).toBe(0);

    process.stdin.isTTY = originalIsTTY;
  });
});
