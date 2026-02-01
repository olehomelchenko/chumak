import { describe, it, expect } from 'vitest';
import { parseExpression } from './expression-parser';
import { interpretAST } from './ast-interpreter';

describe('String Functions', () => {
  const row = {
    name: 'Hello World',
    padded: '  trimmed  ',
    empty: '',
    nullVal: null,
  };

  describe('upper()', () => {
    it('should convert to uppercase', () => {
      expect(interpretAST(parseExpression('upper(name)'), row)).toBe('HELLO WORLD');
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('upper(nullVal)'), row)).toBe(null);
    });

    it('should handle empty string', () => {
      expect(interpretAST(parseExpression('upper(empty)'), row)).toBe('');
    });
  });

  describe('lower()', () => {
    it('should convert to lowercase', () => {
      expect(interpretAST(parseExpression('lower(name)'), row)).toBe('hello world');
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('lower(nullVal)'), row)).toBe(null);
    });
  });

  describe('trim()', () => {
    it('should remove leading and trailing whitespace', () => {
      expect(interpretAST(parseExpression('trim(padded)'), row)).toBe('trimmed');
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('trim(nullVal)'), row)).toBe(null);
    });

    it('should handle string without whitespace', () => {
      expect(interpretAST(parseExpression('trim(name)'), row)).toBe('Hello World');
    });
  });

  describe('titlecase()', () => {
    it('should capitalize first letter of each word', () => {
      expect(interpretAST(parseExpression('titlecase(name)'), row)).toBe('Hello World');
    });

    it('should convert all-uppercase to title case', () => {
      expect(interpretAST(parseExpression('titlecase("HELLO WORLD")'), row)).toBe('Hello World');
    });

    it('should convert all-lowercase to title case', () => {
      expect(interpretAST(parseExpression('titlecase("hello world")'), row)).toBe('Hello World');
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('titlecase(nullVal)'), row)).toBe(null);
    });

    it('should handle empty string', () => {
      expect(interpretAST(parseExpression('titlecase(empty)'), row)).toBe('');
    });

    it('should preserve multiple spaces between words', () => {
      expect(interpretAST(parseExpression('titlecase("hello  world")'), row)).toBe('Hello  World');
    });

    it('should handle single word', () => {
      expect(interpretAST(parseExpression('titlecase("hello")'), row)).toBe('Hello');
    });
  });

  describe('substring()', () => {
    it('should extract substring with start and length', () => {
      expect(interpretAST(parseExpression('substring(name, 0, 5)'), row)).toBe('Hello');
    });

    it('should extract from start to end when no length', () => {
      expect(interpretAST(parseExpression('substring(name, 6)'), row)).toBe('World');
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('substring(nullVal, 0, 5)'), row)).toBe(null);
    });

    it('should handle start beyond string length', () => {
      expect(interpretAST(parseExpression('substring(name, 100)'), row)).toBe('');
    });

    it('should handle negative start as 0', () => {
      expect(interpretAST(parseExpression('substring(name, -5, 5)'), row)).toBe('Hello');
    });
  });
});

describe('Math Functions', () => {
  const row = {
    positive: 42.7,
    negative: -15.3,
    integer: 100,
    zero: 0,
    nullVal: null,
    notANumber: 'abc',
  };

  describe('abs()', () => {
    it('should return absolute value of positive', () => {
      expect(interpretAST(parseExpression('abs(positive)'), row)).toBe(42.7);
    });

    it('should return absolute value of negative', () => {
      expect(interpretAST(parseExpression('abs(negative)'), row)).toBe(15.3);
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('abs(nullVal)'), row)).toBe(null);
    });

    it('should return null for non-numeric string', () => {
      expect(interpretAST(parseExpression('abs(notANumber)'), row)).toBe(null);
    });
  });

  describe('round()', () => {
    it('should round to integer by default', () => {
      expect(interpretAST(parseExpression('round(positive)'), row)).toBe(43);
    });

    it('should round to specified decimals', () => {
      expect(interpretAST(parseExpression('round(positive, 1)'), row)).toBe(42.7);
    });

    it('should handle negative numbers', () => {
      expect(interpretAST(parseExpression('round(negative)'), row)).toBe(-15);
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('round(nullVal)'), row)).toBe(null);
    });
  });

  describe('floor()', () => {
    it('should round down positive', () => {
      expect(interpretAST(parseExpression('floor(positive)'), row)).toBe(42);
    });

    it('should round down negative (towards negative infinity)', () => {
      expect(interpretAST(parseExpression('floor(negative)'), row)).toBe(-16);
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('floor(nullVal)'), row)).toBe(null);
    });
  });

  describe('ceil()', () => {
    it('should round up positive', () => {
      expect(interpretAST(parseExpression('ceil(positive)'), row)).toBe(43);
    });

    it('should round up negative (towards positive infinity)', () => {
      expect(interpretAST(parseExpression('ceil(negative)'), row)).toBe(-15);
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('ceil(nullVal)'), row)).toBe(null);
    });
  });

  describe('min()', () => {
    it('should return minimum of multiple values', () => {
      expect(interpretAST(parseExpression('min(positive, negative, integer)'), row)).toBe(-15.3);
    });

    it('should return single value', () => {
      expect(interpretAST(parseExpression('min(positive)'), row)).toBe(42.7);
    });

    it('should ignore null values', () => {
      expect(interpretAST(parseExpression('min(positive, nullVal, negative)'), row)).toBe(-15.3);
    });

    it('should return null if all values are null', () => {
      expect(interpretAST(parseExpression('min(nullVal)'), row)).toBe(null);
    });
  });

  describe('max()', () => {
    it('should return maximum of multiple values', () => {
      expect(interpretAST(parseExpression('max(positive, negative, integer)'), row)).toBe(100);
    });

    it('should return single value', () => {
      expect(interpretAST(parseExpression('max(positive)'), row)).toBe(42.7);
    });

    it('should ignore null values', () => {
      expect(interpretAST(parseExpression('max(positive, nullVal, integer)'), row)).toBe(100);
    });
  });

  describe('new math functions', () => {
    it('should calculate pow()', () => {
      expect(interpretAST(parseExpression('pow(2, 3)'), {})).toBe(8);
      expect(interpretAST(parseExpression('pow(10, -2)'), {})).toBe(0.01);
    });

    it('should calculate sqrt()', () => {
      expect(interpretAST(parseExpression('sqrt(16)'), {})).toBe(4);
      expect(interpretAST(parseExpression('sqrt(-1)'), {})).toBe(null);
    });

    it('should calculate logs', () => {
      expect(interpretAST(parseExpression('ln(e())'), {})).toBeCloseTo(1);
      expect(interpretAST(parseExpression('log10(100)'), {})).toBe(2);
      expect(interpretAST(parseExpression('log2(8)'), {})).toBe(3);
    });

    it('should calculate trig functions', () => {
      expect(interpretAST(parseExpression('sin(0)'), {})).toBe(0);
      expect(interpretAST(parseExpression('cos(0)'), {})).toBe(1);
      expect(interpretAST(parseExpression('round(sin(pi() / 2), 0)'), {})).toBe(1);
    });

    it('should handle radians/degrees conversion', () => {
      expect(interpretAST(parseExpression('radians(180)'), {})).toBeCloseTo(Math.PI);
      expect(interpretAST(parseExpression('degrees(pi())'), {})).toBe(180);
    });

    it('should handle constants', () => {
      expect(interpretAST(parseExpression('pi()'), {})).toBe(Math.PI);
      expect(interpretAST(parseExpression('e()'), {})).toBe(Math.E);
    });

    it('should handle sign and trunc', () => {
      expect(interpretAST(parseExpression('sign(-5)'), {})).toBe(-1);
      expect(interpretAST(parseExpression('sign(5)'), {})).toBe(1);
      expect(interpretAST(parseExpression('trunc(13.37)'), {})).toBe(13);
      expect(interpretAST(parseExpression('trunc(-13.37)'), {})).toBe(-13);
    });
  });
});

describe('Type Conversion Functions', () => {
  const row = {
    intStr: '42',
    floatStr: '3.14',
    invalid: 'abc',
    empty: '',
    nullVal: null,
    numericVal: 123,
    nanVal: NaN,
  };

  describe('parse_int()', () => {
    it('should parse integer string', () => {
      expect(interpretAST(parseExpression('parse_int(intStr)'), row)).toBe(42);
    });

    it('should parse float string to integer', () => {
      expect(interpretAST(parseExpression('parse_int(floatStr)'), row)).toBe(3);
    });

    it('should return null for invalid string', () => {
      expect(interpretAST(parseExpression('parse_int(invalid)'), row)).toBe(null);
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('parse_int(nullVal)'), row)).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(interpretAST(parseExpression('parse_int(empty)'), row)).toBe(null);
    });
  });

  describe('parse_float()', () => {
    it('should parse float string', () => {
      expect(interpretAST(parseExpression('parse_float(floatStr)'), row)).toBe(3.14);
    });

    it('should parse integer string as float', () => {
      expect(interpretAST(parseExpression('parse_float(intStr)'), row)).toBe(42);
    });

    it('should return null for invalid string', () => {
      expect(interpretAST(parseExpression('parse_float(invalid)'), row)).toBe(null);
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('parse_float(nullVal)'), row)).toBe(null);
    });
  });

  describe('is_nan()', () => {
    it('should return true for NaN', () => {
      expect(interpretAST(parseExpression('is_nan(nanVal)'), row)).toBe(true);
    });

    it('should return true for non-numeric string', () => {
      expect(interpretAST(parseExpression('is_nan(invalid)'), row)).toBe(true);
    });

    it('should return false for valid number', () => {
      expect(interpretAST(parseExpression('is_nan(numericVal)'), row)).toBe(false);
    });

    it('should return false for numeric string', () => {
      expect(interpretAST(parseExpression('is_nan(intStr)'), row)).toBe(false);
    });

    it('should return false for null (null is not NaN)', () => {
      expect(interpretAST(parseExpression('is_nan(nullVal)'), row)).toBe(false);
    });
  });
});

describe('String Functions - split()', () => {
  const row = {
    fullName: 'Alice Smith',
    filename: 'document.backup.csv',
    tags: 'red,green,blue',
    single: 'word',
    empty: '',
    nullVal: null,
  };

  it('should split string and return segment at index', () => {
    expect(interpretAST(parseExpression("split(fullName, ' ', 0)"), row)).toBe('Alice');
    expect(interpretAST(parseExpression("split(fullName, ' ', 1)"), row)).toBe('Smith');
  });

  it('should handle negative index (from end)', () => {
    expect(interpretAST(parseExpression("split(filename, '.', -1)"), row)).toBe('csv');
    expect(interpretAST(parseExpression("split(filename, '.', -2)"), row)).toBe('backup');
  });

  it('should return null for out-of-bounds index', () => {
    expect(interpretAST(parseExpression("split(fullName, ' ', 5)"), row)).toBe(null);
    expect(interpretAST(parseExpression("split(fullName, ' ', -5)"), row)).toBe(null);
  });

  it('should return null for null input', () => {
    expect(interpretAST(parseExpression("split(nullVal, ',', 0)"), row)).toBe(null);
  });

  it('should handle default index (0)', () => {
    expect(interpretAST(parseExpression("split(tags, ',')"), row)).toBe('red');
  });

  it('should handle empty delimiter', () => {
    expect(interpretAST(parseExpression("split('abc', '', 0)"), {})).toBe('a');
    expect(interpretAST(parseExpression("split('abc', '', 1)"), {})).toBe('b');
  });
});

describe('String Comparison Functions (Case-Sensitive)', () => {
  const row = {
    name: 'Alice',
    code: 'ABC123',
    filename: 'Document.csv',
    nullVal: null,
  };

  describe('equals()', () => {
    it('should compare strings case-sensitively', () => {
      expect(interpretAST(parseExpression('equals(name, "Alice")'), row)).toBe(true);
      expect(interpretAST(parseExpression('equals(name, "alice")'), row)).toBe(false);
      expect(interpretAST(parseExpression('equals(name, "ALICE")'), row)).toBe(false);
      expect(interpretAST(parseExpression('equals(name, "Bob")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('equals(nullVal, "test")'), row)).toBe(false);
    });
  });

  describe('contains()', () => {
    it('should check substring case-sensitively', () => {
      expect(interpretAST(parseExpression('contains(code, "ABC")'), row)).toBe(true);
      expect(interpretAST(parseExpression('contains(code, "abc")'), row)).toBe(false);
      expect(interpretAST(parseExpression('contains(code, "123")'), row)).toBe(true);
      expect(interpretAST(parseExpression('contains(code, "xyz")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('contains(nullVal, "test")'), row)).toBe(false);
    });
  });

  describe('starts_with()', () => {
    it('should check prefix case-sensitively', () => {
      expect(interpretAST(parseExpression('starts_with(code, "ABC")'), row)).toBe(true);
      expect(interpretAST(parseExpression('starts_with(code, "abc")'), row)).toBe(false);
      expect(interpretAST(parseExpression('starts_with(code, "AB")'), row)).toBe(true);
      expect(interpretAST(parseExpression('starts_with(code, "xyz")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('starts_with(nullVal, "test")'), row)).toBe(false);
    });
  });

  describe('ends_with()', () => {
    it('should check suffix case-sensitively', () => {
      expect(interpretAST(parseExpression('ends_with(filename, ".csv")'), row)).toBe(true);
      expect(interpretAST(parseExpression('ends_with(filename, ".CSV")'), row)).toBe(false);
      expect(interpretAST(parseExpression('ends_with(filename, "csv")'), row)).toBe(true);
      expect(interpretAST(parseExpression('ends_with(filename, ".txt")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('ends_with(nullVal, "test")'), row)).toBe(false);
    });
  });
});

describe('Case-Insensitive Comparison Functions', () => {
  const row = {
    name: 'Alice',
    code: 'ABC123',
    filename: 'Document.csv',
    nullVal: null,
  };

  describe('equals_ci()', () => {
    it('should compare strings case-insensitively', () => {
      expect(interpretAST(parseExpression('equals_ci(name, "alice")'), row)).toBe(true);
      expect(interpretAST(parseExpression('equals_ci(name, "ALICE")'), row)).toBe(true);
      expect(interpretAST(parseExpression('equals_ci(name, "Alice")'), row)).toBe(true);
      expect(interpretAST(parseExpression('equals_ci(name, "Bob")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('equals_ci(nullVal, "test")'), row)).toBe(false);
    });
  });

  describe('contains_ci()', () => {
    it('should check substring case-insensitively', () => {
      expect(interpretAST(parseExpression('contains_ci(code, "abc")'), row)).toBe(true);
      expect(interpretAST(parseExpression('contains_ci(code, "ABC")'), row)).toBe(true);
      expect(interpretAST(parseExpression('contains_ci(code, "xyz")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('contains_ci(nullVal, "test")'), row)).toBe(false);
    });
  });

  describe('starts_with_ci()', () => {
    it('should check prefix case-insensitively', () => {
      expect(interpretAST(parseExpression('starts_with_ci(code, "abc")'), row)).toBe(true);
      expect(interpretAST(parseExpression('starts_with_ci(code, "ABC")'), row)).toBe(true);
      expect(interpretAST(parseExpression('starts_with_ci(code, "xyz")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('starts_with_ci(nullVal, "test")'), row)).toBe(false);
    });
  });

  describe('ends_with_ci()', () => {
    it('should check suffix case-insensitively', () => {
      expect(interpretAST(parseExpression('ends_with_ci(filename, ".csv")'), row)).toBe(true);
      expect(interpretAST(parseExpression('ends_with_ci(filename, ".CSV")'), row)).toBe(true);
      expect(interpretAST(parseExpression('ends_with_ci(filename, ".txt")'), row)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(interpretAST(parseExpression('ends_with_ci(nullVal, "test")'), row)).toBe(false);
    });
  });
});

describe('JSON Functions', () => {
  const row = {
    validJson: '{"name": "Alice", "age": 30}',
    nestedJson: '{"user": {"name": "Bob", "email": "bob@example.com"}}',
    arrayJson: '{"items": [{"price": 10}, {"price": 20}]}',
    invalidJson: 'not valid json',
    emptyStr: '',
    nullVal: null,
  };

  describe('is_json()', () => {
    it('should return true for valid JSON strings', () => {
      expect(interpretAST(parseExpression('is_json(validJson)'), row)).toBe(true);
      expect(interpretAST(parseExpression('is_json(nestedJson)'), row)).toBe(true);
      expect(interpretAST(parseExpression('is_json(arrayJson)'), row)).toBe(true);
    });

    it('should return true for JSON primitives', () => {
      const primitiveRow = {
        jsonNum: '123',
        jsonStr: '"hello"',
        jsonBool: 'true',
        jsonNull: 'null',
      };
      expect(interpretAST(parseExpression('is_json(jsonNum)'), primitiveRow)).toBe(true);
      expect(interpretAST(parseExpression('is_json(jsonStr)'), primitiveRow)).toBe(true);
      expect(interpretAST(parseExpression('is_json(jsonBool)'), primitiveRow)).toBe(true);
      expect(interpretAST(parseExpression('is_json(jsonNull)'), primitiveRow)).toBe(true);
    });

    it('should return false for invalid JSON', () => {
      expect(interpretAST(parseExpression('is_json(invalidJson)'), row)).toBe(false);
      expect(interpretAST(parseExpression('is_json(emptyStr)'), row)).toBe(false);
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('is_json(nullVal)'), row)).toBe(null);
    });
  });

  describe('json_extract()', () => {
    it('should extract top-level properties', () => {
      expect(interpretAST(parseExpression('json_extract(validJson, "name")'), row)).toBe('Alice');
      expect(interpretAST(parseExpression('json_extract(validJson, "age")'), row)).toBe(30);
    });

    it('should extract nested properties with dot notation', () => {
      expect(interpretAST(parseExpression('json_extract(nestedJson, "user.name")'), row)).toBe(
        'Bob'
      );
      expect(interpretAST(parseExpression('json_extract(nestedJson, "user.email")'), row)).toBe(
        'bob@example.com'
      );
    });

    it('should extract from arrays using numeric index', () => {
      expect(interpretAST(parseExpression('json_extract(arrayJson, "items.0.price")'), row)).toBe(
        10
      );
      expect(interpretAST(parseExpression('json_extract(arrayJson, "items.1.price")'), row)).toBe(
        20
      );
    });

    it('should return null for non-existent paths', () => {
      expect(interpretAST(parseExpression('json_extract(validJson, "missing")'), row)).toBe(null);
      expect(interpretAST(parseExpression('json_extract(nestedJson, "user.missing")'), row)).toBe(
        null
      );
      expect(interpretAST(parseExpression('json_extract(arrayJson, "items.5.price")'), row)).toBe(
        null
      );
    });

    it('should return null for invalid JSON', () => {
      expect(interpretAST(parseExpression('json_extract(invalidJson, "name")'), row)).toBe(null);
    });

    it('should return null for null input', () => {
      expect(interpretAST(parseExpression('json_extract(nullVal, "name")'), row)).toBe(null);
    });

    it('should handle complex nested structures', () => {
      const complexRow = {
        data: '{"company": {"employees": [{"name": "Alice", "role": "dev"}]}}',
      };
      expect(
        interpretAST(parseExpression('json_extract(data, "company.employees.0.name")'), complexRow)
      ).toBe('Alice');
      expect(
        interpretAST(parseExpression('json_extract(data, "company.employees.0.role")'), complexRow)
      ).toBe('dev');
    });
  });
});

describe('Regex Functions - regexp_replace()', () => {
  const row = {
    text: 'foo bar foo',
    phone: '123-4567',
    name: 'John Doe',
    email: 'john@example.com',
    nullVal: null,
  };

  it('should replace all matches globally', () => {
    expect(interpretAST(parseExpression('regexp_replace(text, "foo", "baz")'), row)).toBe(
      'baz bar baz'
    );
  });

  it('should support capture groups', () => {
    expect(
      interpretAST(
        parseExpression('regexp_replace(phone, "(\\\\d{3})-(\\\\d{4})", "($1) $2")'),
        row
      )
    ).toBe('(123) 4567');
  });

  it('should support case-insensitive replacement', () => {
    expect(interpretAST(parseExpression('regexp_replace(name, "(?i)john", "Jane")'), row)).toBe(
      'Jane Doe'
    );
    expect(interpretAST(parseExpression('regexp_replace(name, "(?i)JOHN", "Jane")'), row)).toBe(
      'Jane Doe'
    );
  });

  it('should replace with empty string', () => {
    expect(interpretAST(parseExpression('regexp_replace(email, "@.*", "")'), row)).toBe('john');
  });

  it('should handle complex patterns', () => {
    const row2 = { data: 'abc123def456' };
    expect(interpretAST(parseExpression('regexp_replace(data, "\\\\d+", "X")'), row2)).toBe(
      'abcXdefX'
    );
  });

  it('should return null for null input', () => {
    expect(interpretAST(parseExpression('regexp_replace(nullVal, "test", "new")'), row)).toBe(null);
  });

  it('should handle no matches', () => {
    expect(interpretAST(parseExpression('regexp_replace(text, "xyz", "new")'), row)).toBe(
      'foo bar foo'
    );
  });

  it('should handle special regex characters', () => {
    const row2 = { data: 'test.file.txt' };
    expect(interpretAST(parseExpression('regexp_replace(data, "\\\\.", "-")'), row2)).toBe(
      'test-file-txt'
    );
  });
});
