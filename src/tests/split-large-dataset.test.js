/**
 * Large Dataset Split Transform Test
 *
 * Verifies that split transform handles large datasets (100k+ rows)
 * without running into "Maximum call stack size exceeded" errors.
 */

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

    const table = aq.from(largeDataset);
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
    expect(result).to.exist;
    expect(result.numRows()).to.equal(150000);
    expect(result.columnNames()).to.include('fullname_1');
    expect(result.columnNames()).to.include('fullname_2');
    expect(result.columnNames()).to.not.include('fullname'); // Original removed
  });

  it('should handle varying split counts in large dataset', () => {
    // Create dataset with varying number of segments
    const largeDataset = [];
    for (let i = 0; i < 100000; i++) {
      // Create emails with 2-5 segments separated by dots
      const segments = (i % 4) + 2; // 2, 3, 4, or 5 segments
      const parts = [];
      for (let j = 0; j < segments; j++) {
        parts.push(`part${j}`);
      }
      largeDataset.push({
        id: i,
        domain: parts.join('.') + '.com',
      });
    }

    const table = aq.from(largeDataset);
    const transform = {
      split: {
        column: 'domain',
        delimiter: '.',
        isRegex: false,
        mode: 'spread',
        keepOriginal: true,
      },
    };

    // Should not throw stack overflow
    const result = applyTransform(table, transform, ['id', 'domain']);

    // Verify the transform worked
    expect(result).to.exist;
    expect(result.numRows()).to.equal(100000);
    expect(result.columnNames()).to.include('domain'); // Original kept
    expect(result.columnNames()).to.include('domain_1');
    // Max segments would be 6 (5 parts + 'com')
    expect(result.columnNames()).to.include('domain_6');
  });

  it('should handle large dataset with firstN mode', () => {
    const largeDataset = [];
    for (let i = 0; i < 200000; i++) {
      largeDataset.push({
        id: i,
        path: `/api/v1/users/${i}/profile/${i % 100}/settings`,
      });
    }

    const table = aq.from(largeDataset);
    const transform = {
      split: {
        column: 'path',
        delimiter: '/',
        isRegex: false,
        mode: 'firstN',
        maxColumns: 3,
        keepOriginal: false,
      },
    };

    // Should not throw stack overflow
    const result = applyTransform(table, transform, ['id', 'path']);

    // Verify the transform worked
    expect(result).to.exist;
    expect(result.numRows()).to.equal(200000);
    expect(result.columnNames()).to.include('path_1');
    expect(result.columnNames()).to.include('path_2');
    expect(result.columnNames()).to.include('path_3');
    expect(result.columnNames()).to.not.include('path_4'); // Only 3 columns requested
  });
});
