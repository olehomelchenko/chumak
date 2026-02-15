# Aggregate & Window Functions

Functions available in the Group By (Aggregate) and Window Functions transforms.

## Aggregate Functions

Used in the **Group By** transform to summarize groups of rows.

| Function   | Description                    |
| ---------- | ------------------------------ |
| `count`    | Number of rows in the group    |
| `sum`      | Total of numeric values        |
| `mean`     | Average (arithmetic mean)      |
| `median`   | Middle value (50th percentile) |
| `min`      | Smallest value                 |
| `max`      | Largest value                  |
| `distinct` | Count of unique values         |
| `stdev`    | Standard deviation             |
| `first`    | First value in the group       |
| `last`     | Last value in the group        |

### Example

Group by `Region`, aggregate `Sales` with `sum`:

```
Region  | sum_Sales
--------|---------
North   | 45000
South   | 32000
```

---

## Window Functions

Used in the **Window Functions** transform. These add computed columns based on row position without reducing rows.

### Ranking

| Function       | Description                     | Example Output        |
| -------------- | ------------------------------- | --------------------- |
| `row_number`   | Sequential numbers              | 1, 2, 3, 4, 5         |
| `rank`         | Rank with gaps for ties         | 1, 2, 2, 4, 5         |
| `dense_rank`   | Rank without gaps               | 1, 2, 2, 3, 4         |
| `percent_rank` | Percentage rank (0 to 1)        | 0, 0.25, 0.5, 0.75, 1 |
| `ntile`        | Distribute into N equal buckets | 1, 1, 2, 2, 3         |

### Offset

| Function      | Description                              |
| ------------- | ---------------------------------------- |
| `lag`         | Value from N rows before the current row |
| `lead`        | Value from N rows after the current row  |
| `first_value` | First value in the partition             |
| `last_value`  | Last value in the partition              |

### Fill

| Function    | Description                                             |
| ----------- | ------------------------------------------------------- |
| `fill_down` | Replace nulls with the most recent non-null value above |
| `fill_up`   | Replace nulls with the next non-null value below        |

### Window Example

Order by `Date`, add `lag(Sales, 1)`:

```
Date       | Sales | lag_Sales
-----------|-------|----------
2024-01-01 | 100   | null
2024-01-02 | 150   | 100
2024-01-03 | 120   | 150
```

### Tips

- **Order By** is required for meaningful results — it determines the row sequence
- **Partition By** restarts the window for each group (like GROUP BY but without collapsing rows)
- **Lag/Lead** accept an offset (default 1) and an optional default value for edge rows
- **N-Tile** distributes rows into the specified number of equal-sized buckets
