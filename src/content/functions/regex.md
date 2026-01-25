# Regex Functions

2 functions available

## regexp_match

Tests if a value matches a regular expression pattern

**Parameters:**

- `value` — Text value to test
- `pattern` — Regular expression pattern (use (?i) prefix for case-insensitive)

**Returns:** true if pattern matches, false otherwise, null if value is null

**Examples:**

```
regexp_match(email, "@gmail\\.com$")
regexp_match(name, "(?i)john") // Case-insensitive
```

---

## regexp_extract

Extracts text matching a regular expression pattern

**Parameters:**

- `value` — Text value to extract from
- `pattern` — Regular expression pattern
- `group` — Capture group index (default: 0 for full match)

**Returns:** Matched text or null if no match

**Examples:**

```
regexp_extract(phone, "\\d{3}-\\d{4}")
regexp_extract(name, "(\\w+) (\\w+)", 1) // First capture group
```

---
