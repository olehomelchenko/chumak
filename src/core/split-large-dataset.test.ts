import { describe, it, expect } from 'vitest';
import * as aq from 'arquero';
import { applyTransform } from './transforms';

describe('Split Transform - Large Dataset Handling', () => {
  it('should handle 100k+ rows without stack overflow', () => {
    // Create a large dataset (150k rows)
    const largeDataset = [];
    for (let i = 0; i < 150000; i++) {
      largeDataset.push({
        id: i,
        email: `user${i}@example.com`,
        fullname: `FirstName${i} LastName${i}`,
      });
    }

    const table = (aq as any).from(largeDataset);
    const transform = {
      split: {
        column: 'fullname',
        delimiter: ' ',
        isRegex: false,
        mode: 'spread',
        keepOriginal: false,
      },
    };

    // This should not throw "Maximum call stack size exceeded"
    const result = applyTransform(table, transform, ['id', 'email', 'fullname']);

    // Verify the transform worked
    expect(result).toBeDefined();
    expect(result.numRows()).toBe(150000);
    expect(result.columnNames()).toContain('fullname_1');
    expect(result.columnNames()).not.toContain('fullname');
  });

  it('should handle varying split counts in large dataset', () => {
    const largeDataset = [];
    for (let i = 0; i < 50000; i++) { // Reduced to 50k for faster tests
      const segments = (i % 4) + 2;
      const parts = [];
      for (let j = 0; j < segments; j++) {
        parts.push(`part${j}`);
      }
      largeDataset.push({
        id: i,
        domain: parts.join('.') + '.com',
      });
    }

    const table = (aq as any).from(largeDataset);
    const transform = {
      split: {
        column: 'domain',
        delimiter: '.',
        isRegex: false,
        mode: 'spread',
        keepOriginal: true,
      },
    };

    const result = applyTransform(table, transform, ['id', 'domain']);

    expect(result.numRows()).toBe(50000);
    expect(result.columnNames()).toContain('domain');
    expect(result.columnNames()).toContain('domain_6');
  });
});
