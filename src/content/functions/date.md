# Date Functions

16 functions available

## year

Extracts the year from a date value

**Parameters:**

- `value` — Date value or date string

**Returns:** Year as number (e.g., 2024), or null if invalid

**Examples:**

```
year(order_date)
year("2024-01-15") -> 2024
```

---

## month

Extracts the month from a date value

**Parameters:**

- `value` — Date value or date string

**Returns:** Month as number (1-12), or null if invalid

**Examples:**

```
month(created_at)
month("2024-03-15") -> 3
```

---

## day

Extracts the day of month from a date value

**Parameters:**

- `value` — Date value or date string

**Returns:** Day as number (1-31), or null if invalid

**Examples:**

```
day(birth_date)
day("2024-01-15") -> 15
```

---

## hour

Extracts the hour from a datetime value

**Parameters:**

- `value` — Datetime value or datetime string

**Returns:** Hour as number (0-23), or null if invalid

**Examples:**

```
hour(timestamp)
hour("2024-01-15T14:30:00") -> 14
```

---

## minute

Extracts the minute from a datetime value

**Parameters:**

- `value` — Datetime value or datetime string

**Returns:** Minute as number (0-59), or null if invalid

**Examples:**

```
minute(timestamp)
minute("2024-01-15T14:30:00") -> 30
```

---

## second

Extracts the second from a datetime value

**Parameters:**

- `value` — Datetime value or datetime string

**Returns:** Second as number (0-59), or null if invalid

**Examples:**

```
second(timestamp)
second("2024-01-15T14:30:45") -> 45
```

---

## weekday

Returns the day of week (ISO 8601: 0=Monday, 6=Sunday)

**Parameters:**

- `value` — Date value or date string

**Returns:** Day of week as number (0-6), or null if invalid

**Examples:**

```
weekday(date)
weekday("2024-01-15") -> 0 // Monday
```

---

## week

Returns the ISO week number of the year

**Parameters:**

- `value` — Date value or date string

**Returns:** Week number (1-53), or null if invalid

**Examples:**

```
week(order_date)
week("2024-01-15") -> 3
```

---

## quarter

Returns the quarter of the year

**Parameters:**

- `value` — Date value or date string

**Returns:** Quarter as number (1-4), or null if invalid

**Examples:**

```
quarter(sale_date)
quarter("2024-03-15") -> 1
```

---

## today

Returns the current date in YYYY-MM-DD format

**Returns:** Current date as string

**Examples:**

```
order_date == today()
today() -> "2024-01-15"
```

---

## now

Returns the current datetime in ISO format

**Returns:** Current datetime as string

**Examples:**

```
created_at < now()
now() -> "2024-01-15T14:30:45"
```

---

## days_between

Calculates the number of days between two dates

**Parameters:**

- `date1` — Start date
- `date2` — End date

**Returns:** Number of days from date1 to date2, or null if either date is invalid

**Examples:**

```
days_between(start, end)
days_between("2024-01-01", "2024-01-15") -> 14
```

---

## date_add

Adds a time interval to a date

**Parameters:**

- `value` — Date value or date string
- `amount` — Number of units to add (can be negative)
- `unit` — Time unit: "days", "months", "years", "hours", "minutes", "seconds"

**Returns:** New date/datetime as string, or null if invalid

**Examples:**

```
date_add(order_date, 30, "days")
date_add("2024-01-15", 2, "months") -> "2024-03-15"
```

---

## date_trunc

Truncates a date to the start of a time period

**Parameters:**

- `value` — Date value or date string
- `unit` — Truncation unit: "year", "quarter", "month", "week", "day", "hour", "minute", "second"

**Returns:** Truncated date/datetime as string, or null if invalid

**Examples:**

```
date_trunc(timestamp, "month")
date_trunc("2024-01-15", "month") -> "2024-01-01"
```

---

## format_date

Formats a date using a custom format string

**Parameters:**

- `value` — Date value or date string
- `format` — Format string using tokens (YYYY, MM, DD, HH, mm, ss, etc.)

**Returns:** Formatted date string, or null if invalid

**Examples:**

```
format_date(date, "DD/MM/YYYY")
format_date("2024-01-15", "MM/DD/YYYY") -> "01/15/2024"
```

---

## parse_date

Parses a date string using a custom format pattern

**Parameters:**

- `value` — String value to parse
- `format` — Format string using tokens (YYYY, MM, DD, HH, mm, ss, YY, M, D, H, m, s)

**Returns:** Parsed date as ISO string ("YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss"), or null if invalid

**Examples:**

```
parse_date(date_col, "DD/MM/YYYY")
parse_date("15/06/2024", "DD/MM/YYYY") -> "2024-06-15"
```

---
