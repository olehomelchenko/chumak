# Text Functions

15 functions available

## upper

Converts text to uppercase

**Parameters:**

- `value` — Text value

**Returns:** Uppercase string, or null if input is null

**Examples:**

```
upper(name)
upper("john doe") → "JOHN DOE"
```

---

## lower

Converts text to lowercase

**Parameters:**

- `value` — Text value

**Returns:** Lowercase string, or null if input is null

**Examples:**

```
lower(name)
lower("JOHN DOE") → "john doe"
```

---

## titlecase

Converts text to title case (capitalizes first letter of each word)

**Parameters:**

- `value` — Text value

**Returns:** Title case string, or null if input is null

**Examples:**

```
titlecase(name)
titlecase("john doe") → "John Doe"
```

---

## trim

Removes leading and trailing whitespace

**Parameters:**

- `value` — Text value

**Returns:** Trimmed string, or null if input is null

**Examples:**

```
trim(padded)
trim("  hello  ") → "hello"
```

---

## substring

Extracts a substring from text

**Parameters:**

- `value` — Text value
- `start` — Start index (0-based)
- `length` — Optional length of substring

**Returns:** Substring, or null if input is null

**Examples:**

```
substring(name, 5)
substring("John Doe", 0, 4) → "John"
```

---

## len

Returns the length of a string

**Parameters:**

- `value` — Text value

**Returns:** String length as number, or null if input is null

**Examples:**

```
len(name)
len("John Doe") → 8
```

---

## split

Splits text by delimiter and returns segment at index

**Parameters:**

- `value` — Text value to split
- `delimiter` — Delimiter string
- `index` — Index of segment to return (default: 0, use -1 for last segment)

**Returns:** Segment at index, or null if index is out of bounds

**Examples:**

```
split("a,b,c", ",")
split("a,b,c", ",", 2) → "c"
split("a,b,c", ",", -1) → "c"
```

---

## equals

Tests if two values are equal (case-sensitive)

**Parameters:**

- `value1` — First value
- `value2` — Second value

**Returns:** true if equal, false otherwise

**Examples:**

```
equals(name, "Alice")
equals("Alice", "alice") → false
```

---

## contains

Tests if text contains a substring (case-sensitive)

**Parameters:**

- `value` — Text value
- `substring` — Substring to search for

**Returns:** true if substring is found, false otherwise

**Examples:**

```
contains(code, "ABC")
contains("ABCDEF", "BCD") → true
```

---

## starts_with

Tests if text starts with a prefix (case-sensitive)

**Parameters:**

- `value` — Text value
- `prefix` — Prefix to check for

**Returns:** true if text starts with prefix, false otherwise

**Examples:**

```
starts_with(code, "AB")
starts_with("ABCDEF", "ABC") → true
```

---

## ends_with

Tests if text ends with a suffix (case-sensitive)

**Parameters:**

- `value` — Text value
- `suffix` — Suffix to check for

**Returns:** true if text ends with suffix, false otherwise

**Examples:**

```
ends_with(file, ".csv")
ends_with("data.csv", ".csv") → true
```

---

## equals_ci

Tests if two values are equal (case-insensitive)

**Parameters:**

- `value1` — First value
- `value2` — Second value

**Returns:** true if equal (ignoring case), false otherwise

**Examples:**

```
equals_ci(name, "alice")
equals_ci("Alice", "ALICE") → true
```

---

## contains_ci

Tests if text contains a substring (case-insensitive)

**Parameters:**

- `value` — Text value
- `substring` — Substring to search for

**Returns:** true if substring is found (ignoring case), false otherwise

**Examples:**

```
contains_ci(code, "abc")
contains_ci("ABCDEF", "bcd") → true
```

---

## starts_with_ci

Tests if text starts with a prefix (case-insensitive)

**Parameters:**

- `value` — Text value
- `prefix` — Prefix to check for

**Returns:** true if text starts with prefix (ignoring case), false otherwise

**Examples:**

```
starts_with_ci(code, "ab")
starts_with_ci("ABCDEF", "abc") → true
```

---

## ends_with_ci

Tests if text ends with a suffix (case-insensitive)

**Parameters:**

- `value` — Text value
- `suffix` — Suffix to check for

**Returns:** true if text ends with suffix (ignoring case), false otherwise

**Examples:**

```
ends_with_ci(file, ".CSV")
ends_with_ci("data.csv", ".CSV") → true
```

---
