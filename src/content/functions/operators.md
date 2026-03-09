# Operators

## Arithmetic

| Operator | Description        | Example            |
| -------- | ------------------ | ------------------ |
| `+`      | Addition           | `price + tax`      |
| `-`      | Subtraction        | `revenue - cost`   |
| `*`      | Multiplication     | `price * quantity` |
| `/`      | Division           | `total / count`    |
| `%`      | Modulo (remainder) | `id % 2`           |

## Comparison

| Operator | Description           | Example               |
| -------- | --------------------- | --------------------- |
| `>`      | Greater than          | `sales > 1000`        |
| `<`      | Less than             | `age < 18`            |
| `>=`     | Greater than or equal | `score >= 90`         |
| `<=`     | Less than or equal    | `price <= 100`        |
| `==`     | Equal                 | `status == "active"`  |
| `!=`     | Not equal             | `region != "Unknown"` |

## Logical

| Operator | Description | Example                                     |
| -------- | ----------- | ------------------------------------------- |
| `and`    | Logical AND | `sales > 1000 and region == "North"`        |
| `or`     | Logical OR  | `status == "pending" or status == "review"` |
| `not`    | Logical NOT | `not is_deleted`                            |

## Special

| Operator | Description           | Example                        |
| -------- | --------------------- | ------------------------------ |
| `? :`    | Conditional (ternary) | `profit > 0 ? "Gain" : "Loss"` |
| `??`     | Null/error coalescing | `discount ?? 0`                |

**Note on `??`:** The null coalescing operator treats both `null` and conversion errors as "missing". For example, `price ?? 0` returns `0` when `price` is null OR contains a conversion error.

## Error propagation

Conversion errors propagate through arithmetic, comparison, and logical operators. If either operand is an error, the result is an error. Use `is_error(value)` to detect errors, `??` or `coalesce()` to provide fallbacks.
