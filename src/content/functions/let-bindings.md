# Let Bindings

Give a name to an intermediate value and reuse it inside a single expression.

## Why use them

When the same sub-expression appears more than once, the formula becomes hard to read and slower to run. Compare:

```
if(len(trim(lower([Name]))) > 0, trim(lower([Name])), "unknown")
```

With a `let` binding, you compute the cleaned-up name once, name it `s`, and refer to it twice:

```
let s = trim(lower([Name])) in
  if(len(s) > 0, s, "unknown")
```

Same result — shorter, clearer, and `trim(lower(...))` only runs once.

## Syntax

```
let NAME = VALUE in BODY
```

- **`let`** introduces the binding.
- **`NAME`** is the local name you choose — any plain identifier (letters, digits, underscores).
- **`VALUE`** is any expression — literal, column reference, function call, anything.
- **`in`** separates the bindings from the body.
- **`BODY`** is the expression that can use the name.

The result of the whole `let` is the result of `BODY`.

## Multiple bindings

Separate bindings with commas. Each binding can refer to earlier ones:

```
let
  gross = [Price] * [Quantity],
  tax = gross * 0.2,
  total = gross + tax
in total
```

Reads top-to-bottom like a short recipe: compute `gross`, then `tax` using `gross`, then `total` using both.

## Shadowing a column

If a binding has the same name as a column, the binding "wins" inside the body. The column keeps its meaning outside the `let`.

```
let sales = 0 in sales + [Cost]
```

Inside the body, `sales` is `0` — not the column.

## Working with errors

Bindings pass error values through as-is, so you can detect and recover from them in the body:

```
let n = parse_int([Raw]) in
  is_error(n) ? 0 : n
```

Or more concisely with `??`:

```
let n = parse_int([Raw]) in n ?? 0
```

## Nesting

You can put a `let` inside another `let`:

```
let x = let y = [Sales] in y * 2 in x - [Cost]
```

Each `let` needs its own `in`. Usually splitting across several bindings reads better than deep nesting:

```
let
  y = [Sales],
  x = y * 2
in x - [Cost]
```

## Rules and limits

- Binding names must be plain identifiers — not `[Bracketed Names]`.
- You cannot use a function name (`trim`, `if`, `len`, …) as a binding.
- A binding is visible only inside its own `let` body, nowhere else.
- Bindings are optional. Everything you can write with `let` can also be written without it — `let` just makes some formulas easier to read.

## When to reach for `let`

Good fits:

- The same sub-expression appears twice or more.
- A formula has two or three logical "steps" you want to label.
- An intermediate value is expensive (parse, regex, lookup) and you want it computed once.

Not needed for:

- Simple one-shot formulas like `[Price] * [Quantity]`.
- Cases where a new transform step would be clearer than a long expression.
