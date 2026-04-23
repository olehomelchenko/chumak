import { describe, it, expect } from 'vitest';
import { assertNoCollisions, pickUniqueName } from './unique-names';

describe('unique-names', () => {
  describe('assertNoCollisions', () => {
    it('passes when generated names do not clash', () => {
      expect(() => assertNoCollisions(['x_1', 'x_2'], ['a', 'b'], 'Split')).not.toThrow();
    });

    it('throws with a single-column message on one clash', () => {
      expect(() => assertNoCollisions(['x_1'], ['x_1', 'other'], 'Split')).toThrow(
        /Split would overwrite existing column: "x_1"/
      );
    });

    it('throws with a plural message on multiple clashes', () => {
      expect(() => assertNoCollisions(['x_1', 'x_2'], ['x_1', 'x_2'], 'Split')).toThrow(
        /Split would overwrite existing columns: "x_1", "x_2"/
      );
    });

    it('ignores non-colliding generated names', () => {
      expect(() => assertNoCollisions(['x_1', 'x_2', 'x_3'], ['x_2'], 'Split')).toThrow(/"x_2"/);
    });
  });

  describe('pickUniqueName', () => {
    it('returns base when free', () => {
      expect(pickUniqueName('foo', ['bar', 'baz'])).toBe('foo');
    });

    it('appends _2 when base exists', () => {
      expect(pickUniqueName('foo', ['foo'])).toBe('foo_2');
    });

    it('increments until free', () => {
      expect(pickUniqueName('foo', ['foo', 'foo_2', 'foo_3'])).toBe('foo_4');
    });
  });
});
