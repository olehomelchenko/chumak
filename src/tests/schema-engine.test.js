/**
 * Tests for schema-engine.js
 */

describe('Schema Engine', () => {
  describe('inferType()', () => {
    it('should infer integer', () => {
      const values = [1, 2, 3, 100];
      expect(SchemaEngine.inferType(values)).to.equal('integer');
    });

    it('should infer float', () => {
      const values = [1.1, 2.2, 3.3, 100.001];
      expect(SchemaEngine.inferType(values)).to.equal('float');
    });

    it('should infer boolean', () => {
      const values = [true, false, true];
      expect(SchemaEngine.inferType(values)).to.equal('boolean');
    });

    it('should infer string when mixed', () => {
      const values = [1, 'two', 3];
      expect(SchemaEngine.inferType(values)).to.equal('string');
    });

    it('should infer ISO date', () => {
      const values = ['2023-01-01', '2023-01-02', '2023-12-31'];
      expect(SchemaEngine.inferType(values)).to.equal('date');
    });

    it('should infer ISO date with slashes', () => {
      const values = ['2023/01/01', '2023/01/02', '2023/12/31'];
      expect(SchemaEngine.inferType(values)).to.equal('date');
    });

    it('should infer American date format (MM/DD/YYYY)', () => {
      const values = ['11/8/2016', '01/01/2023', '12/31/2022'];
      expect(SchemaEngine.inferType(values)).to.equal('date');
    });

    it('should infer American date format (M/D/YYYY)', () => {
      const values = ['1/1/2023', '2/2/2023', '12/31/2022'];
      expect(SchemaEngine.inferType(values)).to.equal('date');
    });

    it('should infer datetime', () => {
      const values = ['2023-01-01T12:00:00', '2023-01-01 12:00:00'];
      expect(SchemaEngine.inferType(values)).to.equal('datetime');
    });

    it('should handle nulls and empty strings', () => {
      const values = [1, null, undefined, '', 2];
      expect(SchemaEngine.inferType(values)).to.equal('integer');
    });

    it('should return string for empty input', () => {
      expect(SchemaEngine.inferType([])).to.equal('string');
      expect(SchemaEngine.inferType(null)).to.equal('string');
    });
  });
});
