# Conversion Functions

5 functions available

## parse_int

Parses a value as an integer

**Parameters:**

- `value` — Value to parse

**Returns:** Integer value, or null if parsing fails

**Examples:**

```
parse_int("42")
parse_int("42") -> 42
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
parse_float("3.14") -> 3.14
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
is_nan("abc") -> true
```

---

## if

Returns one of two values based on a condition (if-then-else)

**Parameters:**

- `condition` — Expression that evaluates to true or false
- `then_value` — Value returned when condition is true
- `else_value` — Value returned when condition is false

**Returns:** then_value if condition is truthy, else_value otherwise

**Examples:**

```
if(age >= 18, "adult", "minor")
if(score > 90, "A", "B") -> "A" (when score is 95)
```

---

## coalesce

Returns the first non-null value from a list of arguments

**Parameters:**

- `args` — Variable number of values to check

**Returns:** First non-null/non-undefined value, or null if all are null

**Examples:**

```
coalesce(preferred_name, first_name, "Unknown")
coalesce(null, null, "fallback") -> "fallback"
```

---
