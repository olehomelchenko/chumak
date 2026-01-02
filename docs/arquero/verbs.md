---
title: 'Verbs | Arquero API Reference'
source: 'https://idl.uw.edu/arquero/api/verbs'
author:
  - '[[arquero]]'
published:
created: 2026-01-01
description: 'Query processing and transformation of array-backed data tables.'
tags:
  - 'clippings'
---

## arquero

## Arquero API Reference

| [Top-Level](https://idl.uw.edu/arquero/api) | [Table](https://idl.uw.edu/arquero/api/table) | [**Verbs**](https://idl.uw.edu/arquero/api/verbs) | [Op Functions](https://idl.uw.edu/arquero/api/op) | [Expressions](https://idl.uw.edu/arquero/api/expressions) | [Extensibility](https://idl.uw.edu/arquero/api/extensibility) |
| ------------------------------------------- | --------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |

- [Core Verbs](https://idl.uw.edu/arquero/api/#core-verbs)
  - [assign](https://idl.uw.edu/arquero/api/#assign)
  - [derive](https://idl.uw.edu/arquero/api/#derive)
  - [filter](https://idl.uw.edu/arquero/api/#filter), [slice](https://idl.uw.edu/arquero/api/#slice)
  - [groupby](https://idl.uw.edu/arquero/api/#groupby), [ungroup](https://idl.uw.edu/arquero/api/#ungroup)
  - [orderby](https://idl.uw.edu/arquero/api/#orderby), [unorder](https://idl.uw.edu/arquero/api/#unorder)
  - [rollup](https://idl.uw.edu/arquero/api/#rollup), [count](https://idl.uw.edu/arquero/api/#count)
  - [sample](https://idl.uw.edu/arquero/api/#sample)
  - [select](https://idl.uw.edu/arquero/api/#select), [relocate](https://idl.uw.edu/arquero/api/#relocate), [rename](https://idl.uw.edu/arquero/api/#rename)
  - [reify](https://idl.uw.edu/arquero/api/#reify)
- [Join Verbs](https://idl.uw.edu/arquero/api/#joins)
  - [cross](https://idl.uw.edu/arquero/api/#cross)
  - [join](https://idl.uw.edu/arquero/api/#join), [join_left](https://idl.uw.edu/arquero/api/#join_left), [join_right](https://idl.uw.edu/arquero/api/#join_right), [join_full](https://idl.uw.edu/arquero/api/#join_full)
  - [lookup](https://idl.uw.edu/arquero/api/#lookup)
  - [semijoin](https://idl.uw.edu/arquero/api/#semijoin), [antijoin](https://idl.uw.edu/arquero/api/#antijoin)
- [Cleaning Verbs](https://idl.uw.edu/arquero/api/#cleaning)
  - [dedupe](https://idl.uw.edu/arquero/api/#dedupe), [impute](https://idl.uw.edu/arquero/api/#impute)
- [Reshape Verbs](https://idl.uw.edu/arquero/api/#reshape)
  - [fold](https://idl.uw.edu/arquero/api/#fold), [pivot](https://idl.uw.edu/arquero/api/#pivot)
  - [spread](https://idl.uw.edu/arquero/api/#spread), [unroll](https://idl.uw.edu/arquero/api/#unroll)
- [Set Verbs](https://idl.uw.edu/arquero/api/#sets)
  - [concat](https://idl.uw.edu/arquero/api/#concat), [union](https://idl.uw.edu/arquero/api/#union)
  - [intersect](https://idl.uw.edu/arquero/api/#intersect), [except](https://idl.uw.edu/arquero/api/#except)

## Core Verbs

---

[#](https://idl.uw.edu/arquero/api/#assign) _table_.**assign** (_…tables_) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/assign.js)

Create a new table with additional columns drawn from one or more input _tables_. All tables must have the same numer of rows and will be [reified](https://idl.uw.edu/arquero/api/#reify) prior to assignment. In the case of repeated column names, input table columns overwrite existing columns.

- _tables_: The input tables to merge.

_Examples_

```js
const t1 = aq.table({ a: [1, 2], b: [3, 4] });
const t2 = aq.table({ c: [5, 6], b: [7, 8] });
t1.assign(t2); // { a: [1, 2], b: [7, 8], c: [5, 6] }
```

---

[#](https://idl.uw.edu/arquero/api/#derive) _table_.**derive** (_values_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/derive.js)

Derive new column values based on the provided expressions.

- _values_: Object of name-value pairs defining the columns to derive. The input object should have output column names for keys and table expressions for values.
- _options_: An options object for dropping or relocating derived columns. Use either the _before_ or _after_ property to indicate where to place derived columns. Specifying both before and after is an error. Unlike the [relocate](https://idl.uw.edu/arquero/api/#relocate) verb, this option affects only new columns; overwritten columns with existing names are excluded from relocation.
  - _drop_: A boolean (default `false`) indicating if the original columns should be dropped, leaving only the derived columns. If `true`, the _before_ and _after_ options are ignored.
  - _before_: An anchor column that relocated columns should be placed before. The value can be any legal column selection. If multiple columns are selected, only the _first_ column will be used as an anchor.
  - _after_: An anchor column that relocated columns should be placed after. The value can be any legal column selection. If multiple columns are selected, only the _last_ column will be used as an anchor.

_Examples_

```js
table.derive({ sumXY: (d) => d.x + d.y });
```

```js
table.derive({ z: (d) => d.x * d.y }, { before: 'x' });
```

---

[#](https://idl.uw.edu/arquero/api/#filter) _table_.**filter** (_criteria_) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/filter.js)

Filter a table to a subset of rows based on the input criteria. The resulting table provides a filtered view over the original data; no data copy is made. To create a table that copies only filtered data to new data structures, call [reify](https://idl.uw.edu/arquero/api/#reify) on the output table.

- _criteria_: The filter criteria as a table expression. Both aggregate and window functions are permitted, and will take into account any [groupby](https://idl.uw.edu/arquero/api/#groupby) or [orderby](https://idl.uw.edu/arquero/api/#orderby) settings.

_Examples_

```js
table.filter((d) => op.abs(d.value) < 5);
```

---

[#](https://idl.uw.edu/arquero/api/#slice) _table_.**slice** (\[_start_, _end_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/slice.js)

Extract rows with indices from _start_ to _end_ (_end_ not included), where _start_ and _end_ represent per-group ordered row numbers in the table. The table row indices are determined by the current [orderby](https://idl.uw.edu/arquero/api/#orderby) settings. The _start_ and _end_ arguments are applied separately to each group, as determined by [groupby](https://idl.uw.edu/arquero/api/#groupby).

- _start_: Zero-based index at which to start extraction. A negative index indicates an offset from the end of the group. If start is undefined, slice starts from the index 0.
- _end_: Zero-based index before which to end extraction. A negative index indicates an offset from the end of the group. If end is omitted, slice extracts through the end of the group.

_Examples_

```js
// slice the table to include all rows except for the first and last
table.slice(1, -1);
```

```js
// extract (up to) the first two rows of each group
table.groupby('colA').slice(0, 2);
```

---

[#](https://idl.uw.edu/arquero/api/#groupby) _table_.**groupby** (_…keys_) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/groupby.js)

Group table rows based on a set of column values. Subsequent operations that are sensitive to grouping (such as aggregate functions) will operate over the grouped rows. To undo grouping, use [ungroup](https://idl.uw.edu/arquero/api/#ungroup).

- _keys_: Key column values to group by. Keys may be column name strings, column index numbers, or value objects with output column names for keys and table expressions for values.

_Examples_

```js
table.groupby('colA', 'colB');
```

```js
table.groupby({ key: (d) => d.colA + d.colB });
```

---

[#](https://idl.uw.edu/arquero/api/#ungroup) _table_.**ungroup** () · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/ungroup.js)

Ungroup a table, removing any grouping criteria. Undoes the effects of [groupby](https://idl.uw.edu/arquero/api/#groupby).

_Examples_

```js
table.ungroup();
```

---

[#](https://idl.uw.edu/arquero/api/#orderby) _table_.**orderby** (_…keys_) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/orderby.js)

Order table rows based on a set of column values. Subsequent operations sensitive to ordering (such as window functions) will operate over sorted values. The resulting table provides an view over the original data, without any copying. To create a table with sorted data copied to new data strucures, call [reify](https://idl.uw.edu/arquero/api/#reify) on the result of this method. To undo ordering, use [unorder](https://idl.uw.edu/arquero/api/#unorder).

- _keys_: Key values to sort by, in precedence order. By default, sorting is done in ascending order. To sort in descending order, wrap values using [desc](https://idl.uw.edu/arquero/api/#desc). To provide a custom sort order for a key (such as for locale-specific string comparison), wrap the key value using [collate](https://idl.uw.edu/arquero/api/#collate). If a key is a string, order by the column with that name. If a number, order by the column with that index. If a function, the key must be a valid table expression; aggregate functions are permitted, but window functions are not. If an object, object values must be valid values parameters with output column names for keys and table expressions for values (the output names will be ignored). If an array, array values must be valid key parameters.

_Examples_

```js
// order by column 'a' in ascending order, than 'b' in descending order
table.orderby('a', aq.desc('b'));
```

```js
// same as above, but with object syntax
// key order is significant, but the key names are ignored
table.orderby({ a: 'a', b: aq.desc('b') )})
```

```js
// order by column 'a' according to German locale settings
table.orderby(aq.collate('a', 'de'));
```

```js
// orderby accepts table expressions as well as column names
table.orderby((d) => d.a);
```

```js
// the configurations above can be combined
table.orderby(aq.desc(aq.collate((d) => d.a, 'de')));
```

---

[#](https://idl.uw.edu/arquero/api/#unorder) _table_.**unorder** () · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/unorder.js)

Unorder a table, removing any sorting criteria. Undoes the effects of [orderby](https://idl.uw.edu/arquero/api/#orderby).

_Examples_

```js
table.unorder();
```

---

[#](https://idl.uw.edu/arquero/api/#rollup) _table_.**rollup** (_values_) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/rollup.js)

Rollup a table to produce an aggregate summary. Often used in conjunction with [groupby](https://idl.uw.edu/arquero/api/#groupby). To produce counts only, [count](https://idl.uw.edu/arquero/api/#count) provides a convenient shortcut.

- _values_: Object of name-value pairs defining aggregated output columns. The input object should have output column names for keys and table expressions for values.

_Examples_

```js
table.groupby('colA').rollup({ mean: (d) => op.mean(d.colB) });
```

```js
table.groupby('colA').rollup({ mean: op.median('colB') });
```

---

[#](https://idl.uw.edu/arquero/api/#count) _table_.**count** (\[_options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/ColumnTable.js)

Count the number of values in a group. This method is a shorthand for [rollup](https://idl.uw.edu/arquero/api/#rollup) with a [count](https://idl.uw.edu/arquero/api/op#count) aggregate function.

- _options_: An options object:
  - _as_: The name of the output count column (default `'count'`).

_Examples_

```js
table.groupby('colA').count();
```

```js
table.groupby('colA').count({ as: 'num' });
```

---

[#](https://idl.uw.edu/arquero/api/#sample) _table_.**sample** (_size_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/sample.js)

Generate a table from a random sample of rows. If the table is grouped, perform [stratified sampling](https://en.wikipedia.org/wiki/Stratified_sampling) by sampling separately from each group.

- _size_: The number of samples to draw per group. If number-valued, the same sample size is used for each group. If function-valued, the input should be an aggregate table expression compatible with [rollup](https://idl.uw.edu/arquero/api/#rollup).
- _options_: An options object:
  - _replace_: Boolean flag (default `false`) to sample with replacement.
  - _shuffle_: Boolean flag (default `true`) to ensure randomly ordered rows.
  - _weight_: Column values to use as weights for sampling. Rows will be sampled with probability proportional to their relative weight. The input should be a column name string or a table expression compatible with [derive](https://idl.uw.edu/arquero/api/#derive).

_Examples_

```js
// sample 50 rows without replacement
table.sample(50);
```

```js
// sample 100 rows with replacement
table.sample(100, { replace: true });
```

```js
// stratified sampling with dynamic sample size
table.groupby('colA').sample(aq.frac(0.5));
```

```js
// sample twice the number of records in each group, with replacement
table.groupby('colA').sample(aq.frac(2), { replace: true });
```

---

[#](https://idl.uw.edu/arquero/api/#select) _table_.**select** (…columns) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/select.js)

Select a subset of columns into a new table, potentially renaming them.

- _columns_: The columns to select. The input may consist of: column name strings, column integer indices, objects with current column names as keys and new column names as values (for renaming), or functions that take a table as input and return a valid selection parameter (typically the output of the selection helper functions [all](https://idl.uw.edu/arquero/api/#all), [not](https://idl.uw.edu/arquero/api/#not), or [range](https://idl.uw.edu/arquero/api/#range)).

_Examples_

```js
table.select('colA', 'colB');
```

```js
table.select(aq.not('colB', 'colC'));
```

```js
table.select({ colA: 'newA', colB: 'newB' });
```

---

[#](https://idl.uw.edu/arquero/api/#relocate) _table_.**relocate** (_columns_, _options_) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/relocate.js)

Relocate a subset of columns to change their positions, also potentially renaming them.

- _columns_: An ordered selection of columns to relocate. The input may consist of: column name strings, column integer indices, objects with current column names as keys and new column names as values (for renaming), or functions that take a table as input and return a valid selection parameter (typically the output of the selection helper functions [all](https://idl.uw.edu/arquero/api/#all), [not](https://idl.uw.edu/arquero/api/#not), or [range](https://idl.uw.edu/arquero/api/#range)).
- _options_: An options object for specifying where columns should be relocated. The options must include either the _before_ or _after_ property to indicate where to place the selected columns. Specifying both _before_ and _after_ is an error.
  - _before_: An anchor column that relocated columns should be placed before. The value can be any legal column selection. If multiple columns are selected, only the _first_ column will be used as an anchor.
  - _after_: An anchor column that relocated columns should be placed after. The value can be any legal column selection. If multiple columns are selected, only the _last_ column will be used as an anchor.

_Examples_

```js
// place colY and colZ immediately after colX
table.relocate(['colY', 'colZ'], { after: 'colX' });
```

```js
// place all columns but colB and colC immediately before
// the position of colA prior to relocation
table.relocate(not('colB', 'colC'), { before: 'colA' });
```

```js
// place colA and colB immediately after colC, while also
// respectively renaming them as newA and newB
table.relocate({ colA: 'newA', colB: 'newB' }, { after: 'colC' });
```

---

[#](https://idl.uw.edu/arquero/api/#rename) _table_.**rename** (_columns_) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/rename.js)

Rename one or more columns, preserving column order. The _columns_ input should be an object or Map instance that maps existing column names to new column names. Use the [`names()` helper function](https://idl.uw.edu/arquero/api/#names) to create a rename map based on integer column indices.

- _columns_: A rename object or [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) with current column names as keys and new column names as values, or a selection helper function that takes a table as input and returns a rename map as output.

_Examples_

```js
// rename colA to colA2
table.rename({ colA: 'colA2' });
```

```js
// rename 'old col' to 'new col'
table.rename({ 'old col': 'new col' });
```

```js
// rename colA and colB
table.rename({ colA: 'colA2', colB: 'colB2' });
```

```js
// rename colA and colB, alternate syntax
table.rename({ colA: 'colA2' }, { colB: 'colB2' });
```

```js
// rename the first two columns (by index) to 'colA2' and 'colB2'
table.rename(aq.names('colA2', 'colB2'));
```

---

[#](https://idl.uw.edu/arquero/api/#reify) _table_.**reify** (\[_indices_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Create a new fully-materialized instance of this table. All filter and orderby settings are removed from the new table. Instead, the data itself is filtered and ordered as needed to produce new backing data columns.

- _indices_: An array of ordered row indices to materialize. If unspecified, all rows passing the table filter are used.

_Examples_

```js
// materialize any internal filtering and ordering
table.reify();
```

## Join Verbs

---

[#](https://idl.uw.edu/arquero/api/#cross) _table_.**cross** (_other_ \[, _values_, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/join.js)

Produce the [Cartesian cross product](https://en.wikipedia.org/wiki/Join_%28SQL%29#Cross_join) of two tables. The output table has one row for every pair of input table rows. Beware that outputs may be quite large, as the number of output rows is the product of the input row counts. This method is a convenient shorthand for a [join](https://idl.uw.edu/arquero/api/#join) in which the join criteria is always true.

- _other_: The other (right) table to join with.
- _values_: The columns to include in the join output. If unspecified, all columns from both tables are included. If array-valued, a two element array should be provided, containing column selections to include from the left and right tables, respectively. Array input may consist of column name strings, objects with output names as keys and single-table table expressions as values, or the selection helper functions [all](https://idl.uw.edu/arquero/api/#all), [not](https://idl.uw.edu/arquero/api/#not), or [range](https://idl.uw.edu/arquero/api/#range). If object-valued, specifies the key-value pairs for each output, defined using two-table table expressions.
- _options_: An options object:
  - _suffix_: Column name suffixes to append, for the left and right tables, respectively, when two columns with the same name are produced by the join (default `['_1', '_2']`).

_Examples_

```js
table.cross(other);
```

```js
table.cross(other, [['leftKey', 'leftVal'], ['rightVal']]);
```

---

[#](https://idl.uw.edu/arquero/api/#join) _table_.**join** (_other_ \[, _on_, _values_, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/join.js)

Join two tables, extending the columns of one table with values from the _other_ table. The current table is considered the “left” table in the join, and the new table input is considered the “right” table in the join. By default an [inner join](https://en.wikipedia.org/wiki/Join_%28SQL%29#Inner_join) is performed, removing all rows that do not match the join criteria. To perform left, right, or full outer joins, use the [join_left](https://idl.uw.edu/arquero/api/#join_left}), [join_right](https://idl.uw.edu/arquero/api/#join_right), or [join_full](https://idl.uw.edu/arquero/api/#join_full) methods, or provide an _options_ argument.

- _other_: The other (right) table to join with.
- _on_: The join criteria for matching table rows. If unspecified, the values of all columns with matching names are compared. If array-valued, a two-element array should be provided, containing the columns to compare for the left and right tables, respectively. If a one-element array or a string value is provided, the same column names will be drawn from both tables. If function-valued, should be a two-table table expression that returns a boolean value. When providing a custom predicate, note that join key values can be arrays or objects, and that normal join semantics do not consider null or undefined values to be equal (that is, `null !== null`). Use the [op.equal](https://idl.uw.edu/arquero/api/op#equal) function to handle these cases.
- _values_: The columns to include in the join output. If unspecified, all columns from both tables are included; paired join keys sharing the same column name are included only once. If array-valued, a two element array should be provided, containing column selections to include from the left and right tables, respectively. Array input may consist of column name strings, objects with output names as keys and single-table table expressions as values, or the selection helper functions [all](https://idl.uw.edu/arquero/api/#all), [not](https://idl.uw.edu/arquero/api/#not), or [range](https://idl.uw.edu/arquero/api/#range). If object-valued, specifies the key-value pairs for each output, defined using two-table table expressions.
- _options_: An options object:
  - _left_: Boolean flag (default `false`) indicating a [left outer join](https://en.wikipedia.org/wiki/Join_%28SQL%29#Left_outer_join). If both _left_ and _right_ are true, indicates a [full outer join](https://en.wikipedia.org/wiki/Join_%28SQL%29#Full_outer_join).
  - _right_ Boolean flag (default `false`) indicating a [right outer join](https://en.wikipedia.org/wiki/Join_%28SQL%29#Right_outer_join). If both the _left_ and _right_ are true, indicates a [full outer join](https://en.wikipedia.org/wiki/Join_%28SQL%29#Full_outer_join).
  - _suffix_: Column name suffixes to append, for the left and right tables, respectively, when two columns with the same name are produced by the join (default `['_1', '_2']`).

_Examples_

```js
table.join(other, ['keyL', 'keyR']);
```

```js
table.join(other, (a, b) => op.equal(a.keyL, b.keyR));
```

---

[#](https://idl.uw.edu/arquero/api/#join_left) _table_.**join_left** (_other_ \[, _on_, _values_, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/ColumnTable.js)

Perform a [left outer join](https://en.wikipedia.org/wiki/Join_%28SQL%29#Left_outer_join) on two tables. Rows in the left table that do not match a row in the right table will be preserved. This method is a convenient shorthand with fixed options `{left: true, right: false}` passed to [join](https://idl.uw.edu/arquero/api/#join).

- _other_: The other (right) table to join with.
- _on_: The join criteria for matching table rows. If unspecified, the values of all columns with matching names are compared. If array-valued, a two-element array should be provided, containing the columns to compare for the left and right tables, respectively. If a one-element array or a string value is provided, the same column names will be drawn from both tables. If function-valued, should be a two-table table expression that returns a boolean value. When providing a custom predicate, note that join key values can be arrays or objects, and that normal join semantics do not consider null or undefined values to be equal (that is, `null !== null`). Use the [op.equal](https://idl.uw.edu/arquero/api/op#equal) function to handle these cases.
- _values_: The columns to include in the join output. If unspecified, all columns from both tables are included; paired join keys sharing the same column name are included only once. If array-valued, a two element array should be provided, containing column selections to include from the left and right tables, respectively. Array input may consist of column name strings, objects with output names as keys and single-table table expressions as values, or the selection helper functions [all](https://idl.uw.edu/arquero/api/#all), [not](https://idl.uw.edu/arquero/api/#not), or [range](https://idl.uw.edu/arquero/api/#range). If object-valued, specifies the key-value pairs for each output, defined using two-table table expressions.
- _options_: An options object:
  - _suffix_: Column name suffixes to append, for the left and right tables, respectively, when two columns with the same name are produced by the join (default `['_1', '_2']`).

_Examples_

```js
table.join_left(other, ['keyL', 'keyR']);
```

```js
table.join_left(other, (a, b) => op.equal(a.keyL, b.keyR));
```

---

[#](https://idl.uw.edu/arquero/api/#join_right) _table_.**join_right** (_other_ \[, _on_, _values_, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/ColumnTable.js)

Perform a [right outer join](https://en.wikipedia.org/wiki/Join_%28SQL%29#Right_outer_join) on two tables. Rows in the right table that do not match a row in the left table will be preserved. This method is a convenient shorthand with fixed options `{left: false, right: true}` passed to [join](https://idl.uw.edu/arquero/api/#join).

- _other_: The other (right) table to join with.
- _on_: The join criteria for matching table rows. If unspecified, the values of all columns with matching names are compared. If array-valued, a two-element array should be provided, containing the columns to compare for the left and right tables, respectively. If a one-element array or a string value is provided, the same column names will be drawn from both tables. If function-valued, should be a two-table table expression that returns a boolean value. When providing a custom predicate, note that join key values can be arrays or objects, and that normal join semantics do not consider null or undefined values to be equal (that is, `null !== null`). Use the [op.equal](https://idl.uw.edu/arquero/api/op#equal) function to handle these cases.
- _values_: The columns to include in the join output. If unspecified, all columns from both tables are included; paired join keys sharing the same column name are included only once. If array-valued, a two element array should be provided, containing column selections to include from the left and right tables, respectively. Array input may consist of column name strings, objects with output names as keys and single-table table expressions as values, or the selection helper functions [all](https://idl.uw.edu/arquero/api/#all), [not](https://idl.uw.edu/arquero/api/#not), or [range](https://idl.uw.edu/arquero/api/#range). If object-valued, specifies the key-value pairs for each output, defined using two-table table expressions.
- _options_: An options object:
  - _suffix_: Column name suffixes to append, for the left and right tables, respectively, when two columns with the same name are produced by the join (default `['_1', '_2']`).

_Examples_

```js
table.join_right(other, ['keyL', 'keyR']);
```

```js
table.join_right(other, (a, b) => op.equal(a.keyL, b.keyR));
```

---

[#](https://idl.uw.edu/arquero/api/#join_full) _table_.**join_full** (_other_ \[, _on_, _values_, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/ColumnTable.js)

Perform a [full outer join](https://en.wikipedia.org/wiki/Join_%28SQL%29#Full_outer_join) on two tables. Rows in either the left or right table that do not match a row in the other will be preserved. This method is a convenient shorthand with fixed options `{left: true, right: true}` passed to [join](https://idl.uw.edu/arquero/api/#join).

- _other_: The other (right) table to join with.
- _on_: The join criteria for matching table rows. If unspecified, the values of all columns with matching names are compared. If array-valued, a two-element array should be provided, containing the columns to compare for the left and right tables, respectively. If a one-element array or a string value is provided, the same column names will be drawn from both tables. If function-valued, should be a two-table table expression that returns a boolean value. When providing a custom predicate, note that join key values can be arrays or objects, and that normal join semantics do not consider null or undefined values to be equal (that is, `null !== null`). Use the [op.equal](https://idl.uw.edu/arquero/api/op#equal) function to handle these cases.
- _values_: The columns to include in the join output. If unspecified, all columns from both tables are included; paired join keys sharing the same column name are included only once. If array-valued, a two element array should be provided, containing column selections to include from the left and right tables, respectively. Array input may consist of column name strings, objects with output names as keys and single-table table expressions as values, or the selection helper functions [all](https://idl.uw.edu/arquero/api/#all), [not](https://idl.uw.edu/arquero/api/#not), or [range](https://idl.uw.edu/arquero/api/#range). If object-valued, specifies the key-value pairs for each output, defined using two-table table expressions.
- _options_: An options object:
  - _suffix_: Column name suffixes to append, for the left and right tables, respectively, when two columns with the same name are produced by the join (default `['_1', '_2']`).

_Examples_

```js
table.join_full(other, ['keyL', 'keyR']);
```

```js
table.join_full(other, (a, b) => op.equal(a.keyL, b.keyR));
```

---

[#](https://idl.uw.edu/arquero/api/#lookup) _table_.**lookup** (_other_ \[, _on_, _…values_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/lookup.js)

Lookup values from a secondary table (_other_) and add them as new columns. A lookup occurs upon matching key values for rows in both tables. If the secondary table has multiple rows with the same key, only the last observed instance will be considered in the lookup. Lookup is similar to [join_left](https://idl.uw.edu/arquero/api/#join_left), but with a streamlined syntax and the added constraint of allowing at most one match only.

- _other_: The secondary table to look up values from.
- _on_: A lookup key or two-element array of lookup keys (column name strings or table expressions) for this table and the secondary table, respectively. If a single key value is provided, it is used as the lookup key for both tables. If unspecified, all columns with matching names are compared.
- _values_: The column values to add from the secondary table. Can be column name strings or objects with column names as keys and table expressions as values. If unspecified, includes all columns from the secondary table whose names do no match any column in the primary table.

_Example_

```js
table.lookup(other, ['key1', 'key2'], 'value1', 'value2');
```

---

[#](https://idl.uw.edu/arquero/api/#semijoin) _table_.**semijoin** (_other_ \[, _on_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/join-filter.js)

Perform a [semi-join](https://en.wikipedia.org/wiki/Relational_algebra#Semijoin), filtering the left table to only rows that match a row in the right table.

Similar to the [filter](https://idl.uw.edu/arquero/api/#filter) verb, the resulting table provides a filtered view over the original data; no data copy is made. To create a table that copies only semi-joined data to new data structures, call [reify](https://idl.uw.edu/arquero/api/#reify) on the output table.

- _other_: The other (right) table to join with.
- _on_: The join criteria for matching table rows. If unspecified, the values of all columns with matching names are compared. If array-valued, a two-element array should be provided, containing the columns to compare for the left and right tables, respectively. If a one-element array or a string value is provided, the same column names will be drawn from both tables. If function-valued, should be a two-table table expression that returns a boolean value. When providing a custom predicate, note that join key values can be arrays or objects, and that normal join semantics do not consider null or undefined values to be equal (that is, `null !== null`). Use the [op.equal](https://idl.uw.edu/arquero/api/op#equal) function to handle these cases.

_Examples_

```js
table.semijoin(other);
```

```js
table.semijoin(other, ['keyL', 'keyR']);
```

```js
table.semijoin(other, (a, b) => op.equal(a.keyL, b.keyR));
```

---

[#](https://idl.uw.edu/arquero/api/#antijoin) _table_.**antijoin** (_other_ \[, _on_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/join-filter.js)

Perform an [anti-join](https://en.wikipedia.org/wiki/Relational_algebra#Antijoin), filtering the left table to only rows that do _not_ match a row in the right table.

Similar to the [filter](https://idl.uw.edu/arquero/api/#filter) verb, the resulting table provides a filtered view over the original data; no data copy is made. To create a table that copies only anti-joined data to new data structures, call [reify](https://idl.uw.edu/arquero/api/#reify) on the output table.

- _other_: The other (right) table to join with.
- _on_: The join criteria for matching table rows. If unspecified, the values of all columns with matching names are compared. If array-valued, a two-element array should be provided, containing the columns to compare for the left and right tables, respectively. If a one-element array or a string value is provided, the same column names will be drawn from both tables. If function-valued, should be a two-table table expression that returns a boolean value. When providing a custom predicate, note that join key values can be arrays or objects, and that normal join semantics do not consider null or undefined values to be equal (that is, `null !== null`). Use the [op.equal](https://idl.uw.edu/arquero/api/op#equal) function to handle these cases.

_Examples_

```js
table.antijoin(other);
```

```js
table.antijoin(other, ['keyL', 'keyR']);
```

```js
table.antijoin(other, (a, b) => op.equal(a.keyL, b.keyR));
```

## Cleaning Verbs

---

[#](https://idl.uw.edu/arquero/api/#dedupe) _table_.**dedupe** (_…keys_) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/dedupe.js)

De-duplicate table rows by removing repeated row values.

- _keys_: Key columns to check for duplicates. Two rows are considered duplicates if they have matching values for all keys. If keys are unspecified, all columns are used. Keys may be column name strings, column index numbers, or value objects with output column names for keys and table expressions for values.

_Examples_

```js
// remove rows that duplicate all column values
table.dedupe();
```

```js
// remove rows that duplicate the 'a' and 'b' columns
table.dedupe('a', 'b');
```

```js
// remove rows that duplicate the absolute value of column 'a'
table.dedupe({ abs: (d) => op.abs(d.a) });
```

---

[#](https://idl.uw.edu/arquero/api/#impute) _table_.**impute** (_values_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/impute.js)

Impute missing values or rows. Any of `null`, `undefined`, or `NaN` are considered missing values.

The _expand_ option additionally imputes new rows for missing combinations of values. All combinations of expand values (the full cross product) are considered for each group (if specified by [groupby](https://idl.uw.edu/arquero/api/#groupby)). New rows are added for any combination of expand and groupby values not already contained in the table; the additional columns are populated with imputed values (if specified in _values_) or are otherwise `undefined`.

The output table persists a [groupby](https://idl.uw.edu/arquero/api/#groupby) specification. If the _expand_ option is specified, a reified table is returned without any [filter](https://idl.uw.edu/arquero/api/#filter) or [orderby](https://idl.uw.edu/arquero/api/#orderby) settings.

- _values_: Object of name-value pairs for the column values to impute. The input object should have existing column names for keys and table expressions for values. The expressions will be evaluated to determine replacements for any missing values (`null`, `undefined`, or `NaN`).
- _options_: An options object:
  - _expand_: Impute new rows for any missing combinations of the provided expansion values. Accepts column names, column indices, or an object of name-expression pairs. Table expressions must be valid inputs to [rollup](https://idl.uw.edu/arquero/api/#rollup). All combinations of values will be checked for each unique set of groupby values.

_Examples_

```js
// replace missing values in column 'v' with zeros
table.impute({ v: () => 0 });
```

```js
// replace missing values in column 'v' with the mean of non-missing values
table.impute({ v: (d) => op.mean(d.v) });
```

```js
// replace missing values in column 'v' with zeros
// impute rows based on all combinations of values in columns 'x' and 'y'
table.impute({ v: () => 0 }, { expand: ['x', 'y'] });
```

## Reshape Verbs

---

[#](https://idl.uw.edu/arquero/api/#fold) _table_.**fold** (_values_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/fold.js)

Fold one or more columns into two key-value pair columns. The fold transform is an inverse of the [pivot](https://idl.uw.edu/arquero/api/#pivot) transform. The resulting table has two new columns, one containing the column names (named “key”) and the other the column values (named “value”). The number of output rows equals the original row count multiplied by the number of folded columns.

- _values_: The columns to fold. The input may consist of an array with column name strings, objects with output names as keys and current names as values (output names will be ignored), or the output of the selection helper functions [all](https://idl.uw.edu/arquero/api/#all), [not](https://idl.uw.edu/arquero/api/#not), or [range](https://idl.uw.edu/arquero/api/#range)).
- _options_: An options object:
  - _as_: A two-element array indicating the output column names to use for the key and value columns, respectively. The default is `['key', 'value']`.

_Examples_

```js
table.fold('colA');
```

```js
table.fold(['colA', 'colB']);
```

```js
table.fold(aq.range(5, 8));
```

---

[#](https://idl.uw.edu/arquero/api/#pivot) _table_.**pivot** (_keys_, _values_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/pivot.js)

Pivot columns into a cross-tabulation. The pivot transform is an inverse of the [fold](https://idl.uw.edu/arquero/api/#fold) transform. The resulting table has new columns for each unique combination of the provided _keys_, populated with the provided _values_. The provided _values_ must be aggregates, as a single set of keys may include more than one row. If string-valued, the [any](https://idl.uw.edu/arquero/api/op#any) aggregate is used. If only one _values_ column is defined, the new pivoted columns are named using key values directly. Otherwise, input value column names are included as a component of the output column names.

- _keys_: Key values to map to new column names. Keys may be an array of column name strings, column index numbers, or value objects with output column names for keys and table expressions for values.
- _values_: Output values for pivoted columns. Column string names will be wrapped in any [any](https://idl.uw.edu/arquero/api/op#any) aggregate. If object-valued, the input object should have output value names for keys and aggregate table expressions for values.
- _options_: An options object:
  - _limit_: The maximum number of new columns to generate (default `Infinity`).
  - _keySeparator_: A string to place between multiple key names (default `'_'`).
  - _valueSeparator_: A string to place between key and value names (default `'_'`).
  - _sort_: A boolean flag (default `true`) for alphabetical sorting of new column names.

_Examples_

```js
// pivot the values in the 'key' column to be new column names
// using the 'value' column as the new column values
// the any() aggregate combines multiple values with the same key
table.pivot('key', 'value');
```

```js
// pivot lowercase values of the 'key' column to be new column names
// use the sum of corresponding 'value' entris as new column values
table.pivot({ key: (d) => op.lower(d.key) }, { value: (d) => op.sum(d.value) });
```

```js
// pivot on key column 'type' and value columns ['x', 'y']
// generates: { x_a: [1], x_b: [2], y_a: [3], y_b: [4] }
aq.table({ type: ['a', 'b'], x: [1, 2], y: [3, 4] }).pivot('type', ['x', 'y']);
```

```js
// pivot on the combination of the keys 'foo' and 'bar' for the values of 'x' and 'y'
aq.table({ foo: ['a', 'b'], bar: ['u', 'v'], x: [1, 2], y: [3, 4] }).pivot(
  ['foo', 'bar'],
  ['x', 'y']
);
```

---

[#](https://idl.uw.edu/arquero/api/#spread) _table_.**spread** (_values_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/spread.js)

Spread array elements into a set of new columns. Output columns are named either according to the _as_ option or using a combination of the input colum names and array index.

- _values_: The columns to spread, as either an array of column names or a key-value object of table expressions.
- _options_: An options object:
  - _drop_: Boolean flag (default `true`) indicating if input columns to the spread operation should be dropped in the output table.
  - _limit_: The maximum number of new columns to generate (default `Infinity`).
  - _as_: String array of output column names to use. This option only applies when a single column is spread. If the given array of names is shorter than the number of generated columns and no _limit_ option is specified, the additional generated columns will be dropped (in other words, the length of the _as_ array then serves as the limit value).

_Examples_

```js
// generate new columns 'text_1', 'text_2', etc. by splitting on whitespace
// the input column 'text' is dropped from the output
table.spread({ text: (d) => op.split(d.text, ' ') });
```

```js
// generate new columns 'text_1', 'text_2', etc. by splitting on whitespace
// the input column 'text' is retained in the output
table.spread({ text: (d) => op.split(d.text, ' ') }, { drop: false });
```

```js
// spread the 'arrayCol' column across a maximum of 100 new columns
table.spread('arrayCol', { limit: 100 });
```

```js
// extract the first two 'arrayCol' entries into 'value1', 'value2' columns
table.spread('arrayCol', { as: ['value1', 'value2'] });
```

---

[#](https://idl.uw.edu/arquero/api/#unroll) _table_.**unroll** (_values_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/unroll.js)

Unroll one or more array-valued columns into new rows. If more than one array value is used, the number of new rows is the smaller of the limit and the largest length. Values for all other columns are copied over.

- _values_: The columns to unroll, as either an array of column names or a key-value object of table expressions.
- _options_: An options object:
  - _limit_: The maximum number of new columns to generate per array value (default `Infinity`).
  - _index_: Boolean flag (default `false`) or column name for adding zero-based array index values as an output column. If `true`, a new column named “index” will be added. If string-valued, a new column with the given name will be added.
  - _drop_: A selection of columns to drop (exclude) from the unrolled output. The input may consist of column name strings, column integer indices, objects with output names as keys (object values will be ignored), or the output of the selection helper functions [all](https://idl.uw.edu/arquero/api/#all), [not](https://idl.uw.edu/arquero/api/#not), or [range](https://idl.uw.edu/arquero/api/#range)).

_Examples_

```js
table.unroll('colA', { limit: 1000 });
```

```js
table.unroll('colA', { limit: 1000, index: 'idxnum' });
```

## Set Verbs

---

[#](https://idl.uw.edu/arquero/api/#concat) _table_.**concat** (_…tables_) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/concat.js)

Concatenate multiple tables into a single table, preserving all rows. This transformation mirrors the [UNION_ALL](https://en.wikipedia.org/wiki/Set_operations_%28SQL%29#UNION_operator) operation in SQL. It is similar to [union](https://idl.uw.edu/arquero/api/#union) but retains all rows, without removing duplicates. Only named columns in this table are included in the output.

- _tables_: A list of tables to concatenate.

_Examples_

```js
table.concat(other);
```

```js
table.concat(other1, other2);
```

```js
table.concat([other1, other2]);
```

---

[#](https://idl.uw.edu/arquero/api/#union) _table_.**union** (_…tables_) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/union.js)

Union multiple tables into a single table, deduplicating all rows. This transformation mirrors the [UNION](https://en.wikipedia.org/wiki/Set_operations_%28SQL%29#UNION_operator) operation in SQL. It is similar to [concat](https://idl.uw.edu/arquero/api/#concat) but suppresses duplicate rows with values identical to another row. Only named columns in this table are included in the output.

- _tables_: A list of tables to union.

_Examples_

```js
table.union(other);
```

```js
table.union(other1, other2);
```

```js
table.union([other1, other2]);
```

---

[#](https://idl.uw.edu/arquero/api/#intersect) _table_.**intersect** (_…tables_) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/intersect.js)

[Intersect](https://en.wikipedia.org/wiki/Set_operations_%28SQL%29#INTERSECT_operator) multiple tables, keeping only rows with matching values for all columns in all tables, and deduplicates the rows. This transformation is similar to a series of one or more [semijoin](https://idl.uw.edu/arquero/api/#semijoin) calls, but additionally suppresses duplicate rows.

- _tables_: A list of tables to intersect.

_Examples_

```js
table.intersect(other);
```

```js
table.intersect(other1, other2);
```

```js
table.intersect([other1, other2]);
```

---

[#](https://idl.uw.edu/arquero/api/#except) _table_.**except** (_…tables_) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/except.js)

Compute the [set difference](https://en.wikipedia.org/wiki/Set_operations_%28SQL%29#EXCEPT_operator) with multiple tables, keeping only rows in this table whose values do not occur in the other tables. This transformation is similar to a series of one or more [antijoin](https://idl.uw.edu/arquero/api/#antijoin) calls, but additionally suppresses duplicate rows.

- _tables_: A list of tables to difference.

_Examples_

```js
table.except(other);
```

```js
table.except(other1, other2);
```

```js
table.except([other1, other2]);
```
