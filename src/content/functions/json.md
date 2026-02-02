# JSON Functions

2 functions available

## is_json

Tests if a string contains valid JSON

**Parameters:**

- `value` — String value to test

**Returns:** true if valid JSON, false otherwise, null if input is null

**Examples:**

```
is_json('{"name": "Alice"}')
is_json('{"valid": true}') -> true
is_json('invalid') -> false
```

---

## json_extract

Parses JSON string and extracts value at specified path

**Parameters:**

- `value` — String containing JSON
- `path` — Dot-notation path (e.g., "user.name" or "items.0.price")

**Returns:** Extracted value, or null if path not found or JSON invalid

**Examples:**

```
json_extract('{"name":"Alice"}', "name")
json_extract('{"name":"Alice"}', "name") -> "Alice"
json_extract('{"user":{"email":"a@b.com"}}', "user.email") -> "a@b.com"
json_extract('{"items":[{"price":10}]}', "items.0.price") -> 10
```

---
