# Math Functions

6 functions available

## abs

Returns the absolute value of a number

**Parameters:**

- `value` — Numeric value

**Returns:** Absolute value, or null if input is null/invalid

**Examples:**

```
abs(-5)
abs(-5) → 5
```

---

## round

Rounds a number to specified decimal places

**Parameters:**

- `value` — Numeric value
- `decimals` — Number of decimal places (default: 0)

**Returns:** Rounded number, or null if input is null/invalid

**Examples:**

```
round(3.7)
round(3.14159, 2) → 3.14
```

---

## floor

Rounds a number down to the nearest integer

**Parameters:**

- `value` — Numeric value

**Returns:** Floored number, or null if input is null/invalid

**Examples:**

```
floor(3.9)
floor(3.9) → 3
```

---

## ceil

Rounds a number up to the nearest integer

**Parameters:**

- `value` — Numeric value

**Returns:** Ceiled number, or null if input is null/invalid

**Examples:**

```
ceil(3.1)
ceil(3.1) → 4
```

---

## min

Returns the minimum value from a list of numbers

**Parameters:**

- `args` — Variable number of numeric values

**Returns:** Minimum value, or null if all inputs are null/invalid

**Examples:**

```
min(price, cost, 100)
min(10, 5, 20) → 5
```

---

## max

Returns the maximum value from a list of numbers

**Parameters:**

- `args` — Variable number of numeric values

**Returns:** Maximum value, or null if all inputs are null/invalid

**Examples:**

```
max(price, cost)
max(10, 5, 20) → 20
```

---
