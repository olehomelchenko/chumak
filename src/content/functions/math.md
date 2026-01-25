# Math Functions

26 functions available

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

## pow

Returns the base raised to the power of the exponent

**Parameters:**

- `base` — The base number
- `exponent` — The exponent

**Returns:** Base raised to the power of exponent, or null if invalid

**Examples:**

```
pow(2, 3) → 8
```

---

## sqrt

Returns the square root of a number

**Parameters:**

- `value` — Numeric value

**Returns:** Square root, or null if number is negative or invalid

**Examples:**

```
sqrt(16) → 4
```

---

## cbrt

Returns the cube root of a number

**Parameters:**

- `value` — Numeric value

**Returns:** Cube root, or null if invalid

**Examples:**

```
cbrt(27) → 3
```

---

## exp

Returns e raised to the power of the value

**Parameters:**

- `value` — Numeric value

**Returns:** e^value, or null if invalid

**Examples:**

```
exp(1) → 2.71828...
```

---

## ln

Returns the natural logarithm (base e) of a number

**Parameters:**

- `value` — Numeric value

**Returns:** Natural logarithm, or null if value <= 0 or invalid

**Examples:**

```
ln(2.71828) → 1
```

---

## log10

Returns the base 10 logarithm of a number

**Parameters:**

- `value` — Numeric value

**Returns:** Base 10 logarithm, or null if value <= 0 or invalid

**Examples:**

```
log10(100) → 2
```

---

## log2

Returns the base 2 logarithm of a number

**Parameters:**

- `value` — Numeric value

**Returns:** Base 2 logarithm, or null if value <= 0 or invalid

**Examples:**

```
log2(8) → 3
```

---

## sin

Returns the sine of an angle (in radians)

**Parameters:**

- `value` — Angle in radians

**Returns:** Sine of the angle, or null if invalid

**Examples:**

```
sin(pi() / 2) → 1
```

---

## cos

Returns the cosine of an angle (in radians)

**Parameters:**

- `value` — Angle in radians

**Returns:** Cosine of the angle, or null if invalid

**Examples:**

```
cos(0) → 1
```

---

## tan

Returns the tangent of an angle (in radians)

**Parameters:**

- `value` — Angle in radians

**Returns:** Tangent of the angle, or null if invalid

**Examples:**

```
tan(0) → 0
```

---

## asin

Returns the arcsine (in radians) of a number

**Parameters:**

- `value` — Number between -1 and 1

**Returns:** Arcsine in radians, or null if value is outside [-1, 1] or invalid

**Examples:**

```
asin(1) → 1.57079...
```

---

## acos

Returns the arccosine (in radians) of a number

**Parameters:**

- `value` — Number between -1 and 1

**Returns:** Arccosine in radians, or null if value is outside [-1, 1] or invalid

**Examples:**

```
acos(1) → 0
```

---

## atan

Returns the arctangent (in radians) of a number

**Parameters:**

- `value` — Numeric value

**Returns:** Arctangent in radians, or null if invalid

**Examples:**

```
atan(0) → 0
```

---

## atan2

Returns the angle (in radians) from the X-axis to a point (x, y)

**Parameters:**

- `y` — Y-coordinate
- `x` — X-coordinate

**Returns:** Angle in radians, or null if invalid

**Examples:**

```
atan2(1, 1) → 0.78539...
```

---

## radians

Converts degrees to radians

**Parameters:**

- `value` — Angle in degrees

**Returns:** Angle in radians, or null if invalid

**Examples:**

```
radians(180) → 3.14159...
```

---

## degrees

Converts radians to degrees

**Parameters:**

- `value` — Angle in radians

**Returns:** Angle in degrees, or null if invalid

**Examples:**

```
degrees(pi()) → 180
```

---

## sign

Returns the sign of a number, indicating whether it is positive (1), negative (-1), or zero (0)

**Parameters:**

- `value` — Numeric value

**Returns:** 1, -1, 0, or null if invalid

**Examples:**

```
sign(-5) → -1
```

---

## trunc

Returns the integer part of a number by removing any fractional digits

**Parameters:**

- `value` — Numeric value

**Returns:** Integer part, or null if invalid

**Examples:**

```
trunc(13.37) → 13
```

---

## pi

Returns the value of PI (approximately 3.14159)

**Returns:** PI

**Examples:**

```
pi() → 3.14159...
```

---

## e

Returns Euler's number E (approximately 2.71828)

**Returns:** E

**Examples:**

```
e() → 2.71828...
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
