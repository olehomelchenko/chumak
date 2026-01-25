# Conversion Functions

3 functions available

## parse_int

Parses a value as an integer

**Parameters:**

- `value` — Value to parse

**Returns:** Integer value, or null if parsing fails

**Examples:**

```
parse_int("42")
parse_int("42") → 42
```

---

## parse_float

Parses a value as a floating-point number

**Parameters:**

- `value` — Value to parse

**Returns:** Float value, or null if parsing fails

**Examples:**

```
parse_float("3.14")
parse_float("3.14") → 3.14
```

---

## is_nan

Tests if a value is not a valid number

**Parameters:**

- `value` — Value to test

**Returns:** true if value is NaN, false otherwise

**Examples:**

```
is_nan("abc")
is_nan("abc") → true
```

---
