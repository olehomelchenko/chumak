# Expression Language Reference

Syto uses a safe expression language for filtering rows, deriving new columns, and pattern matching. This reference covers all supported operators and functions.

## Basic Syntax

Expressions reference column names directly. Column names with spaces or special characters must be wrapped in square brackets.

```
price * quantity
[Total Sales] + [Tax Amount]
```

## Operators

### Arithmetic

| Operator | Description        | Example            |
| -------- | ------------------ | ------------------ |
| `+`      | Addition           | `price + tax`      |
| `-`      | Subtraction        | `revenue - cost`   |
| `*`      | Multiplication     | `price * quantity` |
| `/`      | Division           | `total / count`    |
| `%`      | Modulo (remainder) | `id % 2`           |

### Comparison

| Operator | Description           | Example               |
| -------- | --------------------- | --------------------- |
| `>`      | Greater than          | `sales > 1000`        |
| `<`      | Less than             | `age < 18`            |
| `>=`     | Greater than or equal | `score >= 90`         |
| `<=`     | Less than or equal    | `price <= 100`        |
| `==`     | Equal                 | `status == "active"`  |
| `!=`     | Not equal             | `region != "Unknown"` |

### Logical

| Operator       | Description | Example                                     |
| -------------- | ----------- | ------------------------------------------- |
| `and` or `&&`  | AND         | `sales > 1000 and region == "North"`        |
| `or` or `\|\|` | OR          | `status == "pending" or status == "review"` |
| `not` or `!`   | NOT         | `not is_deleted`                            |

> **Tip:** The word-form operators (`and`, `or`, `not`) are recommended for readability, but the symbolic operators (`&&`, `||`, `!`) also work.

### Special Operators

| Operator | Description           | Example                        |
| -------- | --------------------- | ------------------------------ |
| `? :`    | Conditional (ternary) | `profit > 0 ? "Gain" : "Loss"` |
| `??`     | Null coalescing       | `discount ?? 0`                |

## Working with Null Values

The null coalescing operator `??` returns the right-hand value when the left is null or undefined:

```
discount ?? 0           → Returns discount, or 0 if null
middle_name ?? ""       → Returns middle_name, or empty string if null
```

## Conditional Expressions

Use the ternary operator for if-then-else logic:

```
profit > 0 ? "Profit" : "Loss"
age >= 18 ? "Adult" : "Minor"
score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : "F"
```

## Date Functions

### Extracting Date Parts

| Function           | Returns                    | Example              |
| ------------------ | -------------------------- | -------------------- |
| `year(date)`       | Year (e.g., 2024)          | `year(order_date)`   |
| `month(date)`      | Month (1-12)               | `month(created_at)`  |
| `day(date)`        | Day of month (1-31)        | `day(birth_date)`    |
| `hour(datetime)`   | Hour (0-23)                | `hour(timestamp)`    |
| `minute(datetime)` | Minute (0-59)              | `minute(timestamp)`  |
| `second(datetime)` | Second (0-59)              | `second(timestamp)`  |
| `weekday(date)`    | Day of week (0=Mon, 6=Sun) | `weekday(date)`      |
| `week(date)`       | ISO week number (1-53)     | `week(order_date)`   |
| `quarter(date)`    | Quarter (1-4)              | `quarter(sale_date)` |

### Date Utilities

| Function  | Returns                   | Example                 |
| --------- | ------------------------- | ----------------------- |
| `today()` | Current date (YYYY-MM-DD) | `order_date == today()` |
| `now()`   | Current datetime          | `created_at < now()`    |

### Date Arithmetic

| Function                  | Description              | Example                            |
| ------------------------- | ------------------------ | ---------------------------------- |
| `days_between(d1, d2)`    | Days from d1 to d2       | `days_between(start, end)`         |
| `date_add(date, n, unit)` | Add time to date         | `date_add(order_date, 30, "days")` |
| `date_trunc(date, unit)`  | Truncate to period start | `date_trunc(timestamp, "month")`   |
| `format_date(date, fmt)`  | Format as string         | `format_date(date, "DD/MM/YYYY")`  |

**Units for date_add:** `days`, `months`, `years`, `hours`, `minutes`, `seconds`

**Units for date_trunc:** `year`, `quarter`, `month`, `week`, `day`, `hour`

### Format Tokens

| Token  | Description      | Example |
| ------ | ---------------- | ------- |
| `YYYY` | 4-digit year     | 2024    |
| `YY`   | 2-digit year     | 24      |
| `MM`   | Month (01-12)    | 03      |
| `M`    | Month (1-12)     | 3       |
| `DD`   | Day (01-31)      | 07      |
| `D`    | Day (1-31)       | 7       |
| `HH`   | Hour 24h (00-23) | 14      |
| `mm`   | Minute (00-59)   | 05      |
| `ss`   | Second (00-59)   | 09      |

## Text Functions

### Regular Expressions

| Function                               | Returns              | Example                                    |
| -------------------------------------- | -------------------- | ------------------------------------------ |
| `regexp_match(text, pattern)`          | true/false           | `regexp_match(email, "@gmail\\.com$")`     |
| `regexp_extract(text, pattern)`        | Matched text or null | `regexp_extract(phone, "\\d{3}-\\d{4}")`   |
| `regexp_extract(text, pattern, group)` | Capture group        | `regexp_extract(name, "(\\w+) (\\w+)", 1)` |

**Regex flags:** Use `(?flags)` prefix for flags: `(?i)` for case-insensitive, `(?g)` for global.

```
regexp_match(name, "(?i)john")     → Case-insensitive match
regexp_extract(text, "(\\d+)", 1)  → Extract first capture group
```

### String Manipulation

| Function                  | Returns               | Example                          |
| ------------------------- | --------------------- | -------------------------------- |
| `upper(text)`             | Uppercase string      | `upper(name)` → "JOHN DOE"       |
| `lower(text)`             | Lowercase string      | `lower(name)` → "john doe"       |
| `trim(text)`              | Trimmed string        | `trim(padded)` → removes spaces  |
| `substring(text, start)`  | Substring from start  | `substring(name, 5)` → "Doe"     |
| `substring(text, s, len)` | Substring with length | `substring(name, 0, 4)` → "John" |
| `len(text)`               | String length         | `len(name)` → 8                  |
| `split(text, delim)`      | Segment at index 0    | `split("a,b,c", ",")` → "a"      |
| `split(text, delim, idx)` | Segment at index      | `split("a,b,c", ",", 2)` → "c"   |

**Negative indices:** `split(text, delim, -1)` returns the last segment.

### String Comparison

| Function                       | Returns          | Example                                                      |
| ------------------------------ | ---------------- | ------------------------------------------------------------ |
| `equals(text1, text2)`         | Case-sensitive   | `equals(name, "Alice")` → true only if exact match           |
| `contains(text, substring)`    | Case-sensitive   | `contains(code, "ABC")` → true if code contains "ABC"        |
| `starts_with(text, prefix)`    | Case-sensitive   | `starts_with(code, "AB")` → true if code starts with "AB"    |
| `ends_with(text, suffix)`      | Case-sensitive   | `ends_with(file, ".csv")` → true if file ends with ".csv"    |
| `equals_ci(text1, text2)`      | Case-insensitive | `equals_ci(name, "alice")` → true for "Alice", "ALICE", etc. |
| `contains_ci(text, substring)` | Case-insensitive | `contains_ci(code, "abc")` → true for any case               |
| `starts_with_ci(text, prefix)` | Case-insensitive | `starts_with_ci(code, "ab")` → true for any case             |
| `ends_with_ci(text, suffix)`   | Case-insensitive | `ends_with_ci(file, ".CSV")` → true for any case             |

> **Tip:** For equality checks, you can also use the `==` operator: `name == "Alice"` is equivalent to `equals(name, "Alice")`. The functions are useful when you need substring/prefix/suffix checks.

## Math Functions

| Function             | Returns           | Example                          |
| -------------------- | ----------------- | -------------------------------- |
| `abs(x)`             | Absolute value    | `abs(-5)` → 5                    |
| `round(x)`           | Rounded integer   | `round(3.7)` → 4                 |
| `round(x, decimals)` | Rounded to places | `round(3.14159, 2)` → 3.14       |
| `floor(x)`           | Rounded down      | `floor(3.9)` → 3                 |
| `ceil(x)`            | Rounded up        | `ceil(3.1)` → 4                  |
| `min(a, b, ...)`     | Minimum value     | `min(price, cost, 100)` → lowest |
| `max(a, b, ...)`     | Maximum value     | `max(price, cost)` → highest     |

## Type Conversion

| Function         | Returns              | Example                      |
| ---------------- | -------------------- | ---------------------------- |
| `parse_int(x)`   | Integer or null      | `parse_int("42")` → 42       |
| `parse_float(x)` | Float or null        | `parse_float("3.14")` → 3.14 |
| `is_nan(x)`      | true if not-a-number | `is_nan("abc")` → true       |

## Common Patterns

### Filtering Examples

```
// Numeric comparisons
sales > 10000
price >= 50 and price <= 100

// Text matching
region == "North"
status != "cancelled"

// Null handling
email != null
discount != null and discount > 0

// Date filtering
year(order_date) == 2024
days_between(created_at, today()) <= 30

// Regex patterns
regexp_match(email, "@company\\.com$")
regexp_match(sku, "^PRD-\\d{4}$")

// Complex conditions
(status == "active" or status == "pending") and not is_archived
```

### Deriving New Columns

```
// Calculations
revenue - cost                    → profit
(profit / revenue) * 100          → margin_percent
price * (1 - discount ?? 0)       → final_price

// Categorization
profit > 0 ? "Profit" : "Loss"
age >= 65 ? "Senior" : age >= 18 ? "Adult" : "Minor"

// Date extraction
year(order_date)                  → order_year
quarter(sale_date)                → sale_quarter
weekday(date) == 0 ? "Monday" : weekday(date) == 4 ? "Friday" : "Other"

// Text extraction
regexp_extract(email, "(.+)@", 1)           → username from email
regexp_extract(phone, "\\((\d{3})\\)", 1)  → area code

// String manipulation
upper(name)                       → "JOHN DOE"
lower(email)                      → normalized email
trim(input)                       → remove whitespace
substring(sku, 0, 3)              → product category prefix

// Math utilities
abs(profit)                       → always positive
round(percentage, 2)              → two decimal places
min(price, max_budget)            → capped price
max(quantity, 1)                  → at least 1

// Type conversion
parse_int(quantity_str)           → numeric quantity
parse_float(price_str)            → numeric price
is_nan(value) ? 0 : value         → replace invalid with 0
```

## Security Note

Syto's expression engine is sandboxed for security. Expressions cannot:

- Access browser globals (`window`, `document`)
- Execute arbitrary JavaScript
- Access the filesystem or network

All expressions are parsed into an AST and validated before execution.
