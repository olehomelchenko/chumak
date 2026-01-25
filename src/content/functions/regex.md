# Regex Functions

3 functions available

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

## regexp_replace

Replaces text matching a regular expression pattern

**Parameters:**

- `value` — Text value to perform replacement on
- `pattern` — Regular expression pattern to match
- `replacement` — Replacement string (supports $1, $2, etc. for capture groups)

**Returns:** Text with replacements made, or null if value is null

**Examples:**

```
regexp_replace(phone, "(\\d{3})-(\\d{4})", "($1) $2")
regexp_replace(text, "(?i)hello", "Hi") // Case-insensitive replacement
regexp_replace("foo bar foo", "foo", "baz") → "baz bar baz"
```

---
