/**
 * Schema Engine - Numeric String Detection Tests
 *
 * Tests for detecting numeric strings (common after split operations)
 */

describe('SchemaEngine - Numeric String Detection', () => {
  describe('inferType with numeric strings', () => {
    it('should detect year strings as integers', () => {
      const years = ['2024', '2023', '2025', '1999', '2000'];
      expect(SchemaEngine.inferType(years)).to.equal('integer');
    });

    it('should detect month/day strings as integers (with leading zeros)', () => {
      const months = ['01', '02', '03', '11', '12'];
      expect(SchemaEngine.inferType(months)).to.equal('integer');

      const days = ['01', '15', '28', '31'];
      expect(SchemaEngine.inferType(days)).to.equal('integer');
    });

    it('should detect split date parts from YYYY-MM-DD as integers', () => {
      // Simulating split of "2024-01-15" -> ["2024", "01", "15"]
      const yearParts = ['2024', '2023', '2025'];
      const monthParts = ['01', '02', '12'];
      const dayParts = ['15', '01', '31'];

      expect(SchemaEngine.inferType(yearParts)).to.equal('integer');
      expect(SchemaEngine.inferType(monthParts)).to.equal('integer');
      expect(SchemaEngine.inferType(dayParts)).to.equal('integer');
    });

    it('should detect decimal strings as floats', () => {
      const prices = ['19.99', '29.95', '100.00', '5.50'];
      expect(SchemaEngine.inferType(prices)).to.equal('float');
    });

    it('should detect scientific notation strings as floats', () => {
      const scientific = ['1.5e10', '2.3e-5', '1e6'];
      expect(SchemaEngine.inferType(scientific)).to.equal('float');
    });

    it('should handle strings with whitespace', () => {
      const paddedNumbers = ['  2024  ', ' 01', '15 ', '  99  '];
      expect(SchemaEngine.inferType(paddedNumbers)).to.equal('integer');
    });

    it('should NOT detect non-numeric strings as numbers', () => {
      const notNumbers = ['abc', 'hello', 'test'];
      expect(SchemaEngine.inferType(notNumbers)).to.equal('string');
    });

    it('should NOT detect mixed numeric/text as numbers', () => {
      const mixed = ['2024', 'abc', '15'];
      expect(SchemaEngine.inferType(mixed)).to.equal('string');
    });

    it('should handle empty strings in sample', () => {
      // Empty strings are filtered out before type detection
      const withEmpties = ['2024', '', '2023', null, '2025'];
      expect(SchemaEngine.inferType(withEmpties)).to.equal('integer');
    });

    it('should still detect actual date strings as dates, not numbers', () => {
      // Full date strings should be detected as dates, not numeric
      const dates = ['2024-01-15', '2023-12-31', '2025-06-01'];
      expect(SchemaEngine.inferType(dates)).to.equal('date');
    });

    it('should handle negative numbers as integers or floats', () => {
      const negativeInts = ['-5', '-100', '-42'];
      expect(SchemaEngine.inferType(negativeInts)).to.equal('integer');

      const negativeFloats = ['-5.5', '-100.99', '-42.0'];
      expect(SchemaEngine.inferType(negativeFloats)).to.equal('float');
    });

    it('should prioritize numeric detection over date detection for standalone numbers', () => {
      // "2024" alone should be integer, not part of a date
      const justYears = ['2024', '2023'];
      expect(SchemaEngine.inferType(justYears)).to.equal('integer');
    });
  });

  describe('Full split workflow type detection', () => {
    it('should correctly infer types after splitting YYYY-MM-DD dates', () => {
      const data = [
        { date: '2024-01-15' },
        { date: '2023-12-31' },
        { date: '2025-06-01' },
        { date: '2024-03-20' },
      ];

      const table = aq.from(data);
      const splitTransform = {
        split: {
          column: 'date',
          delimiter: '-',
          isRegex: false,
          mode: 'spread',
          keepOriginal: false,
        },
      };

      const result = applyTransform(table, splitTransform, ['date']);
      const resultData = result.objects();

      // Extract the split columns
      const yearValues = resultData.map((row) => row.date_1);
      const monthValues = resultData.map((row) => row.date_2);
      const dayValues = resultData.map((row) => row.date_3);

      // All should be detected as integers
      expect(SchemaEngine.inferType(yearValues)).to.equal('integer');
      expect(SchemaEngine.inferType(monthValues)).to.equal('integer');
      expect(SchemaEngine.inferType(dayValues)).to.equal('integer');
    });

    it('should correctly infer types after splitting price strings', () => {
      const data = [
        { transaction: 'USD:19.99' },
        { transaction: 'USD:29.95' },
        { transaction: 'USD:100.00' },
      ];

      const table = aq.from(data);
      const splitTransform = {
        split: {
          column: 'transaction',
          delimiter: ':',
          isRegex: false,
          mode: 'spread',
          keepOriginal: false,
        },
      };

      const result = applyTransform(table, splitTransform, ['transaction']);
      const resultData = result.objects();

      const currencyValues = resultData.map((row) => row.transaction_1);
      const amountValues = resultData.map((row) => row.transaction_2);

      // Currency should be string, amounts should be float
      expect(SchemaEngine.inferType(currencyValues)).to.equal('string');
      expect(SchemaEngine.inferType(amountValues)).to.equal('float');
    });
  });
});
