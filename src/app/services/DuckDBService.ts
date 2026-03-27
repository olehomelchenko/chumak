/**
 * DuckDB-WASM Service — Lazy-initialized singleton for running SQL transforms.
 *
 * Browser-only. The WASM binary (~3.5 MB) is loaded on first use via dynamic import,
 * keeping the initial bundle unaffected. All queries run in a Web Worker.
 */

import { metricsCollector } from '../infrastructure/metrics';

type DuckDBModule = typeof import('@duckdb/duckdb-wasm');

interface DuckDBInstance {
  db: InstanceType<DuckDBModule['AsyncDuckDB']>;
  conn: Awaited<ReturnType<InstanceType<DuckDBModule['AsyncDuckDB']>['connect']>>;
}

let instance: DuckDBInstance | null = null;
let initPromise: Promise<DuckDBInstance | null> | null = null;
let available = true;
// Serializes execute() calls so concurrent callers don't clobber the shared "input" table.
let execQueue: Promise<unknown> = Promise.resolve();

async function init(): Promise<DuckDBInstance | null> {
  try {
    const duckdb = await import('@duckdb/duckdb-wasm');

    // Import WASM + worker files as URLs via Vite — self-hosted, no CDN/CORS issues
    const [
      { default: mvpWasm },
      { default: mvpWorker },
      { default: ehWasm },
      { default: ehWorker },
    ] = await Promise.all([
      import('@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'),
      import('@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'),
      import('@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'),
      import('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'),
    ]);

    const bundle = await duckdb.selectBundle({
      mvp: { mainModule: mvpWasm, mainWorker: mvpWorker },
      eh: { mainModule: ehWasm, mainWorker: ehWorker },
    });

    const variant = bundle.mainModule === ehWasm ? 'eh' : 'mvp';
    const t0 = performance.now();

    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    const conn = await db.connect();

    metricsCollector.record({
      transformType: `duckdb:init:${variant}`,
      durationMs: performance.now() - t0,
      success: true,
    });

    return { db, conn };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[DuckDB] Failed to initialize, engine unavailable:', error);
    }
    available = false;
    return null;
  }
}

async function ensureInstance(): Promise<DuckDBInstance | null> {
  if (instance) return instance;
  if (!available) return null;
  if (!initPromise) {
    initPromise = init().then((inst) => {
      instance = inst;
      return inst;
    });
  }
  return initPromise;
}

export const DuckDBService = {
  /**
   * Whether DuckDB is potentially available (hasn't failed init yet).
   */
  isAvailable(): boolean {
    return available;
  },

  /**
   * Execute a SQL query against the given data.
   *
   * 1. Registers `data` as a table named "input"
   * 2. Runs `sql` (which should reference "input")
   * 3. Returns plain JS objects + column names
   * 4. Cleans up the temp table
   *
   * Returns null if DuckDB is unavailable or the query fails.
   */
  async execute(data: any[], sql: string): Promise<{ data: any[]; columns: string[] } | null> {
    const inst = await ensureInstance();
    if (!inst) return null;

    // Chain onto the queue so only one query uses the "input" table at a time.
    const result = execQueue.then(async () => {
      try {
        // Register data as JSON buffer → temp table
        const jsonStr = JSON.stringify(data);
        const encoder = new TextEncoder();
        const buffer = encoder.encode(jsonStr);
        await inst.db.registerFileBuffer('_input.json', buffer);
        await inst.conn.query(
          `CREATE OR REPLACE TABLE input AS SELECT * FROM read_json_auto('_input.json')`
        );

        // Run the transform query
        const queryResult = await inst.conn.query(sql);

        // Extract columns and rows
        const columns = queryResult.schema.fields.map((f: any) => f.name);
        const rows: any[] = [];
        for (let i = 0; i < queryResult.numRows; i++) {
          const row: any = {};
          for (const col of columns) {
            const val = queryResult.getChild(col)?.get(i);
            // Convert BigInt to Number for JSON compatibility
            row[col] = typeof val === 'bigint' ? Number(val) : val;
          }
          rows.push(row);
        }

        return { data: rows, columns };
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[DuckDB] Query failed, falling back to Arquero:', error);
          console.warn('[DuckDB] SQL was:', sql);
        }
        return null;
      } finally {
        try {
          await inst.conn.query('DROP TABLE IF EXISTS input');
          await inst.db.dropFile('_input.json');
        } catch {
          // cleanup errors are non-fatal
        }
      }
    });

    // Keep the queue moving even if this query fails.
    execQueue = result.then(
      () => {},
      () => {}
    );

    return result;
  },

  /**
   * Shut down the DuckDB instance and worker.
   */
  async terminate(): Promise<void> {
    if (instance) {
      try {
        await instance.conn.close();
        await instance.db.terminate();
      } catch {
        // ignore
      }
      instance = null;
      initPromise = null;
      execQueue = Promise.resolve();
    }
  },
};
