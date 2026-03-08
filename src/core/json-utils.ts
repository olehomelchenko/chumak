/**
 * Pure JSON utility functions for converting JSON data to tabular form.
 * No browser APIs, no Preact — usable in Node.js and browser contexts.
 */

/**
 * Resolve a path in a JSON object (e.g., "data.items.0")
 */
export function resolvePath(obj: any, path: string): any {
  if (!path) return obj;
  try {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (Array.isArray(current) && /^\d+$/.test(part)) {
        current = current[parseInt(part, 10)];
      } else {
        current = current[part];
      }
    }
    return current;
  } catch (e) {
    return undefined;
  }
}

export type JsonKeyInfo = {
  key: string;
  type: 'object' | 'array' | 'primitive';
  count?: number;
};

function classifyValue(value: any): Pick<JsonKeyInfo, 'type' | 'count'> {
  if (value === null || value === undefined) return { type: 'primitive' };
  if (Array.isArray(value)) return { type: 'array', count: value.length };
  if (typeof value === 'object') return { type: 'object', count: Object.keys(value).length };
  return { type: 'primitive' };
}

/**
 * Get suggested keys for JSON path navigation, with type info.
 * Objects and arrays are navigable; primitives are informational only.
 */
export function getSuggestedKeys(obj: any): JsonKeyInfo[] {
  if (obj === null || typeof obj !== 'object') return [];
  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      const first = obj[0];
      const result: JsonKeyInfo[] = [{ key: '0', ...classifyValue(first) }];
      if (first && typeof first === 'object' && !Array.isArray(first)) {
        for (const k of Object.keys(first)) {
          result.push({ key: k, ...classifyValue(first[k]) });
        }
      }
      return result;
    }
    return [];
  }
  return Object.keys(obj).map((k) => ({ key: k, ...classifyValue(obj[k]) }));
}

/**
 * Flatten nested JSON objects using underscore delimiters.
 * e.g., { user: { name: "Alice" } } → { user_name: "Alice" }
 */
export function flattenData(data: any[]): any[] {
  return data.map((item) => {
    const flattened: any = {};
    const flatten = (obj: any, prefix = '') => {
      if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        const key = prefix.slice(0, -1);
        if (key) flattened[key] = obj;
        return;
      }
      Object.keys(obj).forEach((k) => {
        flatten(obj[k], `${prefix}${k}_`);
      });
    };
    flatten(item);
    return flattened;
  });
}

/**
 * Serialize nested objects to JSON strings.
 * Leaves primitives unchanged; converts objects/arrays to JSON.stringify output.
 */
export function serializeNestedData(data: any[]): any[] {
  return data.map((item) => {
    const newItem: any = {};
    Object.keys(item).forEach((key) => {
      const val = item[key];
      if (val !== null && typeof val === 'object') {
        newItem[key] = JSON.stringify(val);
      } else {
        newItem[key] = val;
      }
    });
    return newItem;
  });
}

/**
 * Resolve duplicate headers by adding numeric suffixes (_2, _3, etc.)
 */
export function resolveDuplicateHeaders(headers: string[]): {
  resolvedHeaders: string[];
  warning: string;
} {
  const seen: Record<string, number> = {};
  const duplicates: { name: string; positions: number[] }[] = [];
  const resolvedHeaders: string[] = [];
  headers.forEach((header, index) => {
    let finalHeader = header;
    if (seen[header] !== undefined) {
      if (!duplicates.some((d) => d.name === header)) {
        duplicates.push({ name: header, positions: [seen[header] + 1] });
      }
      const dupEntry = duplicates.find((d) => d.name === header)!;
      dupEntry.positions.push(index + 1);
      let suffix = 2;
      while (seen[`${header}_${suffix}`] !== undefined) suffix++;
      finalHeader = `${header}_${suffix}`;
    }
    seen[finalHeader] = index;
    resolvedHeaders.push(finalHeader);
  });
  let warning = '';
  if (duplicates.length > 0) {
    const dupList = duplicates
      .map((d) => `"${d.name}" at positions ${d.positions.join(', ')}`)
      .join('; ');
    warning = `Found ${duplicates.length} duplicate column name${duplicates.length > 1 ? 's' : ''}: ${dupList}`;
  }
  return { resolvedHeaders, warning };
}

/**
 * Convert raw JSON to an array of flat row objects suitable for CSV export.
 * Combines path resolution, flattening, and serialization into one call.
 */
export function jsonToRows(
  rawJson: unknown,
  options: {
    path?: string;
    flatten?: boolean;
    serializeNested?: boolean;
  } = {}
): { rows: Record<string, unknown>[]; headers: string[]; warning: string } {
  const { path = '', flatten = false, serializeNested = true } = options;

  const resolved = path ? resolvePath(rawJson, path) : rawJson;

  if (!Array.isArray(resolved) || resolved.length === 0) {
    return { rows: [], headers: [], warning: '' };
  }

  let data = resolved as Record<string, unknown>[];

  if (flatten) {
    data = flattenData(data);
  }

  if (serializeNested) {
    data = serializeNestedData(data);
  }

  const rawHeaders = Object.keys(data[0] || {});
  const { resolvedHeaders, warning } = resolveDuplicateHeaders(rawHeaders);

  // Remap rows to use resolved headers if any were renamed
  if (warning) {
    data = data.map((row) => {
      const newRow: Record<string, unknown> = {};
      rawHeaders.forEach((key, i) => {
        newRow[resolvedHeaders[i]] = row[key];
      });
      return newRow;
    });
  }

  return { rows: data, headers: resolvedHeaders, warning };
}
