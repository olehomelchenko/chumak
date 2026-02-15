import type { ColumnSchema, ColumnType } from '../../core/schema-engine';
import functionDocs from '../../schemas/functions.json';
import styles from './TransformDialog.module.css';

interface FunctionDoc {
  name: string;
  signature: string;
  description: string;
  examples: Array<{ expression: string }>;
}

// Build lookup map at module scope
const functionMap = new Map<string, FunctionDoc>();
for (const fn of functionDocs.functions) {
  functionMap.set(fn.name, fn as FunctionDoc);
}

const TYPE_SUGGESTIONS: Record<string, string[]> = {
  string: ['upper', 'lower', 'trim', 'len', 'contains', 'starts_with', 'split', 'substring'],
  integer: ['round', 'abs', 'min', 'max', 'pow'],
  float: ['round', 'floor', 'ceil', 'abs', 'min', 'max'],
  date: ['year', 'month', 'day', 'weekday', 'days_between', 'date_add', 'format_date'],
  datetime: ['year', 'month', 'day', 'hour', 'minute', 'days_between', 'date_add', 'format_date'],
  json: ['json_extract', 'json_keys', 'json_array_length', 'json_type', 'is_json'],
};

interface ExpressionDocsProps {
  functionNames: string[];
  columnNames: string[];
  schema: ColumnSchema[];
}

export function ExpressionDocs({ functionNames, columnNames, schema }: ExpressionDocsProps) {
  if (schema.length === 0) return null;

  const schemaMap = new Map<string, ColumnType>();
  for (const col of schema) {
    schemaMap.set(col.name, col.type);
  }

  return (
    <div class={styles.dynamicDocs}>
      {functionNames.length > 0 && (
        <div>
          <div class={styles.dynamicDocsTitle}>Functions in expression</div>
          {functionNames.map((name) => {
            const doc = functionMap.get(name);
            if (!doc) return null;
            return (
              <div key={name} class={styles.funcDoc}>
                <code class={styles.funcSignature}>{doc.signature}</code>
                <span class={styles.funcDescription}>{doc.description}</span>
                {doc.examples[0] && (
                  <code class={styles.funcExample}>{doc.examples[0].expression}</code>
                )}
              </div>
            );
          })}
        </div>
      )}

      {columnNames.length > 0 && (
        <div>
          <div class={styles.dynamicDocsTitle}>Columns in expression</div>
          {columnNames.map((name) => {
            const type = schemaMap.get(name);
            if (!type) return null;
            const suggestions = TYPE_SUGGESTIONS[type];
            return (
              <div key={name} class={styles.columnRef}>
                <span>
                  <span class={styles.columnName}>{name}</span>
                  <span class={styles.typeBadge}>{type}</span>
                </span>
                {suggestions && suggestions.length > 0 && (
                  <span class={styles.funcDescription}>
                    Try:{' '}
                    {suggestions.map((s) => (
                      <code key={s} class={styles.funcExample}>
                        {s}
                      </code>
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div>
        <div class={styles.dynamicDocsTitle}>Available columns</div>
        <div class={styles.availableColumns}>
          {schema.map((col) => (
            <div key={col.name} class={styles.availableColumn}>
              <code class={styles.columnName}>{col.name}</code>
              <span class={styles.typeBadge}>{col.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
