# JSON Functions

6 functions available

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

## json_keys

Returns an array of top-level keys from a JSON object string

**Parameters:**

- `value` — String containing a JSON object

**Returns:** Array of key names, or null if not a JSON object or input is null

**Examples:**

```
json_keys('{"name":"Alice","age":30}')
json_keys('{"name":"Alice","age":30}') -> ["name","age"]
json_keys('[1,2,3]') -> null
```

---

## json_array_length

Returns the length of a JSON array string

**Parameters:**

- `value` — String containing a JSON array

**Returns:** Length of the array, or null if not a JSON array or input is null

**Examples:**

```
json_array_length('[1,2,3]')
json_array_length('[1,2,3]') -> 3
json_array_length('{"a":1}') -> null
```

---

## json_type

Returns the JSON type of the top-level value in a JSON string

**Parameters:**

- `value` — String containing valid JSON

**Returns:** One of "object", "array", "string", "number", "boolean", "null", or null if invalid

**Examples:**

```
json_type('{"a":1}')
json_type('{"a":1}') -> "object"
json_type('[1,2]') -> "array"
json_type('"hello"') -> "string"
```

---

## json_stringify

Converts any value to its JSON string representation

**Parameters:**

- `value` — Any value to stringify

**Returns:** JSON string representation

**Examples:**

```
json_stringify(42)
json_stringify(42) -> "42"
json_stringify("hello") -> "\"hello\""
```

---
