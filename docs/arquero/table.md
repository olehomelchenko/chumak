---
title: 'Table | Arquero API Reference'
source: 'https://idl.uw.edu/arquero/api/table'
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

| [Top-Level](https://idl.uw.edu/arquero/api) | [**Table**](https://idl.uw.edu/arquero/api/table) | [Verbs](https://idl.uw.edu/arquero/api/verbs) | [Op Functions](https://idl.uw.edu/arquero/api/op) | [Expressions](https://idl.uw.edu/arquero/api/expressions) | [Extensibility](https://idl.uw.edu/arquero/api/extensibility) |
| ------------------------------------------- | ------------------------------------------------- | --------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |

- [Table Metadata](https://idl.uw.edu/arquero/api/#metadata)
  - [numCols](https://idl.uw.edu/arquero/api/#numCols), [numRows](https://idl.uw.edu/arquero/api/#numRows), [size](https://idl.uw.edu/arquero/api/#size), [totalRows](https://idl.uw.edu/arquero/api/#totalRows)
  - [isFiltered](https://idl.uw.edu/arquero/api/#isFiltered), [isGrouped](https://idl.uw.edu/arquero/api/#isGrouped), [isOrdered](https://idl.uw.edu/arquero/api/#isOrdered)
  - [comparator](https://idl.uw.edu/arquero/api/#comparator), [groups](https://idl.uw.edu/arquero/api/#groups), [mask](https://idl.uw.edu/arquero/api/#mask)
  - [params](https://idl.uw.edu/arquero/api/#params)
- [Table Columns](https://idl.uw.edu/arquero/api/#columns)
  - [column](https://idl.uw.edu/arquero/api/#column), [columnAt](https://idl.uw.edu/arquero/api/#columnAt)
  - [columnIndex](https://idl.uw.edu/arquero/api/#columnIndex), [columnName](https://idl.uw.edu/arquero/api/#columnName), [columnNames](https://idl.uw.edu/arquero/api/#columnNames)
- [Table Values](https://idl.uw.edu/arquero/api/#table-values)
  - [array](https://idl.uw.edu/arquero/api/#array), [values](https://idl.uw.edu/arquero/api/#values)
  - [data](https://idl.uw.edu/arquero/api/#data), [get](https://idl.uw.edu/arquero/api/#get), [getter](https://idl.uw.edu/arquero/api/#getter)
  - [indices](https://idl.uw.edu/arquero/api/#indices), [partitions](https://idl.uw.edu/arquero/api/#partitions), [scan](https://idl.uw.edu/arquero/api/#scan)
- [Table Output](https://idl.uw.edu/arquero/api/#output)
  - [objects](https://idl.uw.edu/arquero/api/#objects), [object](https://idl.uw.edu/arquero/api/#object), [Symbol.iterator](https://idl.uw.edu/arquero/api/#@@iterator)
  - [print](https://idl.uw.edu/arquero/api/#print), [toHTML](https://idl.uw.edu/arquero/api/#toHTML), [toMarkdown](https://idl.uw.edu/arquero/api/#toMarkdown)
  - [toArrow](https://idl.uw.edu/arquero/api/#toArrow), [toArrowIPC](https://idl.uw.edu/arquero/api/#toArrowIPC), [toCSV](https://idl.uw.edu/arquero/api/#toCSV), [toJSON](https://idl.uw.edu/arquero/api/#toJSON)

---

[#](https://idl.uw.edu/arquero/api/#numCols) _table_.**numCols** () · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

The number of columns in this table.

_Examples_

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).numCols(); // 2
```

---

[#](https://idl.uw.edu/arquero/api/#numRows) _table_.**numRows** () · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

The number of active (non-filtered) rows in this table. This number may be less than the [total rows](https://idl.uw.edu/arquero/api/#totalRows) if the table has been filtered.

_Examples_

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).numRows(); // 3
```

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] })
  .filter((d) => d.a > 2)
  .numRows(); // 1
```

---

[#](https://idl.uw.edu/arquero/api/#size) _table_.**size** · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

The number of active (non-filtered) rows in this table. This number is the same as [numRows()](https://idl.uw.edu/arquero/api/#numRows), and may be less than the [total rows](https://idl.uw.edu/arquero/api/#totalRows) if the table has been filtered.

_Examples_

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).size; // 3
```

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).filter((d) => d.a > 2).size; // 1
```

---

[#](https://idl.uw.edu/arquero/api/#totalRows) _table_.**totalRows** () · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

The total number of rows in this table, including both filtered and unfiltered rows.

_Examples_

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).totalRows(); // 3
```

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] })
  .filter((d) => d.a > 2)
  .totalRows(); // 3
```

---

[#](https://idl.uw.edu/arquero/api/#isFiltered) _table_.**isFiltered** () · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Indicates if the table has a filter applied.

_Examples_

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).isFiltered(); // false
```

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] })
  .filter((d) => d.a > 2)
  .isFiltered(); // true
```

---

[#](https://idl.uw.edu/arquero/api/#isGrouped) _table_.**isGrouped** () · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Indicates if the table has a groupby specification.

_Examples_

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).isGrouped(); // false
```

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] })
  .groupby('a')
  .isGrouped(); // true
```

---

[#](https://idl.uw.edu/arquero/api/#isOrdered) _table_.**isOrdered** () · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Indicates if the table has a row order comparator.

_Examples_

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).isOrdered(); // false
```

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] })
  .orderby(aq.desc('b'))
  .isOrdered(); // true
```

---

[#](https://idl.uw.edu/arquero/api/#comparator) _table_.**comparator** () · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Returns the row order comparator function, if specified.

---

[#](https://idl.uw.edu/arquero/api/#groups) _table_.**groups** () · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Returns the groupby specification, if defined. A groupby specification is an object with the following properties:

- _names_: Output column names for each group field.
- _get_: Value accessor functions for each group field.
- _rows_: Row indices of example table rows for each group.
- _size_: The total number of groups.
- _keys_: Per-row group indices for every row in the table.

---

[#](https://idl.uw.edu/arquero/api/#mask) _table_.**mask** () · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Returns the bitset mask for filtered rows, or null if there is no filter.

---

[#](https://idl.uw.edu/arquero/api/#params) _table_.**params** () · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Get or set table expression parameter values. If called with no arguments, returns the current parameter values as an object. Otherwise, adds the provided parameters to this table’s parameter set and returns the table. Any prior parameters with names matching the input parameters are overridden.

Also see the [`escape()` expression helper](https://idl.uw.edu/arquero/api/#escape) for a lightweight alternative that allows access to variables defined in an enclosing scope.

- _values_: A set of parameter values to add as an object of name-value pairs.

_Examples_

```js
table.params({ hi: 5 }).filter((d, $) => abs(d.value) < $.hi);
```

## Table Columns

---

[#](https://idl.uw.edu/arquero/api/#column) _table_.**column** (_name_) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Get the column instance with the given _name_, or `undefined` if does not exist. The returned column object provides a lightweight abstraction over the column storage (such as a backing array), providing a _length_ property and _get(row)_ method.

A column instance may be used across multiple tables and so does _not_ track a table’s filter or orderby critera. To access filtered or ordered values, use the table [get](https://idl.uw.edu/arquero/api/#get), [getter](https://idl.uw.edu/arquero/api/#getter), or [array](https://idl.uw.edu/arquero/api/#array) methods.

- _name_: The column name.

_Examples_

```js
const dt = aq.table({ a: [1, 2, 3], b: [4, 5, 6] });
dt.column('b').get(1); // 5
```

---

[#](https://idl.uw.edu/arquero/api/#columnAt) _table_.**columnAt** (_index_) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Get the column instance at the given index position, or `undefined` if does not exist. The returned column object provides a lightweight abstraction over the column storage (such as a backing array), providing a _length_ property and _get(row)_ method.

- _index_: The zero-based column index.

_Examples_

```js
const dt = aq.table({ a: [1, 2, 3], b: [4, 5, 6] });
dt.columnAt(1).get(1); // 5
```

---

[#](https://idl.uw.edu/arquero/api/#columnIndex) _table_.**columnIndex** (_name_) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

The column index for the given name, or `-1` if the name is not found.

- _name_: The column name.

_Examples_

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).columnIndex('b'); // 1
```

---

[#](https://idl.uw.edu/arquero/api/#columnName) _table_.**columnName** (_index_) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

The column name at the given index, or `undefined` if the index is out of range.

- _index_: The column index.

_Examples_

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).columnName(1); // 'b'
```

---

[#](https://idl.uw.edu/arquero/api/#columnNames) _table_.**columnNames** (\[_filter_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Returns an array of table column names, optionally filtered.

- _filter_: An optional filter callback function. If unspecified, all column names are returned. If _filter_ is provided, it will be invoked for each column name and only those for which the callback returns a [truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy) value will be kept. The filter callback function is called with the following arguments:
  - _name_: The column name.
  - _index_: The column index.
  - _array_: The backing array of names.

_Examples_

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).columnNames(); // [ 'a', 'b' ]
```

## Table Values

---

[#](https://idl.uw.edu/arquero/api/#array) _table_.**array** (_name_ \[, _constructor_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Get an array of values contained in the column with the given _name_. Unlike direct access through the table [column](https://idl.uw.edu/arquero/api/#column) method, the array returned by this method respects any table filter or orderby criteria. By default, a standard [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) is returned; use the _constructor_ argument to specify a [typed array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray).

- _name_: The column name.
- _constructor_: An optional array constructor (default [`Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Array)) to use to instantiate the output array. Note that errors or truncated values may occur when assigning to a typed array with an incompatible type.

_Examples_

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).array('b'); // [ 4, 5, 6 ]
```

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] })
  .filter((d) => d.a > 1)
  .array('b'); // [ 5, 6 ]
```

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).array('b', Int32Array); // Int32Array.of(4, 5, 6)
```

---

[#](https://idl.uw.edu/arquero/api/#values) _table_.**values** (_name_) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Returns an iterator over values in the column with the given _name_. The iterator returned by this method respects any table filter or orderby criteria.

- _name_: The column name.

_Examples_

```js
for (const value of table.values('colA')) {
  // do something with ordered values from column A
}
```

```js
// slightly less efficient version of table.array('colA')
const colValues = Array.from(table.values('colA'));
```

---

[#](https://idl.uw.edu/arquero/api/#data) _table_.**data** () · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Returns the internal table storage data structure: an object with column names for keys and column arrays for values. This method returns the same structure used by the Table (not a copy) and its contents should not be modified.

---

[#](https://idl.uw.edu/arquero/api/#get) _table_.**get** (_name_ \[, _row_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Get the value for the given column and row. Row indices are relative to any filtering and ordering criteria, not the internal data layout.

- _name_: The column name.
- _row_: The row index (default `0`), relative to any filtering or ordering criteria.

_Examples_

```js
const dt = aq.table({ a: [1, 2, 3], b: [4, 5, 6] });
dt.get('a', 0); // 1
dt.get('a', 2); // 3
```

```js
const dt = aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).orderby(aq.desc('b'));
dt.get('a', 0); // 3
dt.get('a', 2); // 1
```

---

[#](https://idl.uw.edu/arquero/api/#getter) _table_.**getter** (_name_) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Returns an accessor (“getter”) function for a column. The returned function takes a row index as its single argument and returns the corresponding column value. Row indices are relative to any filtering and ordering criteria, not the internal data layout.

- _name_: The column name.

_Examples_

```js
const get = aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).getter('a');
get(0); // 1
get(2); // 3
```

```js
const dt = aq
  .table({ a: [1, 2, 3], b: [4, 5, 6] })
  .orderby(aq.desc('b'))
  .getter('a');
get(0); // 3
get(2); // 1
```

---

[#](https://idl.uw.edu/arquero/api/#indices) _table_.**indices** (\[_order_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Returns an array of indices for all rows passing the table filter.

- _order_: A boolean flag (default `true`) indicating if the returned indices should be sorted if this table is ordered. If `false`, the returned indices may or may not be sorted.

---

[#](https://idl.uw.edu/arquero/api/#partitions) _table_.**partitions** (\[_order_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Returns an array of indices for each group in the table. If the table is not grouped, the result is the same as [indices](https://idl.uw.edu/arquero/api/#indices), but wrapped within an array. Otherwise returns an array of row index arrays, one per group. The indices will be filtered if the table has been filtered.

- _order_: A boolean flag (default `true`) indicating if the returned indices should be sorted if this table is ordered. If `false`, the returned indices may or may not be sorted.

---

[#](https://idl.uw.edu/arquero/api/#scan) _table_.**scan** (_callback_ \[, _order_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Perform a table scan, invoking the provided _callback_ function for each row of the table. If this table is filtered, only rows passing the filter are visited.

- _callback_: Function invoked for each row of the table. The callback is invoked with the following arguments:
  - _row_: The table row index.
  - _data_: The backing table data store (as returned by table [`data`](https://idl.uw.edu/arquero/api/#data) method).
  - _stop_: A function to stop the scan early. The callback can invoke _stop()_ to prevent future scan calls.
- _order_: A boolean flag (default `false`), indicating if the table should be scanned in the order determined by [orderby](https://idl.uw.edu/arquero/api/verbs#orderby). This argument has no effect if the table is unordered.

## Table Output

---

[#](https://idl.uw.edu/arquero/api/#objects) _table_.**objects** (\[_options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Returns an array of objects representing table rows. A new set of objects will be created, copying the backing table data.

- _options_: Options for row generation:
  - _limit_: The maximum number of objects to create (default `Infinity`).
  - _offset_: The row offset indicating how many initial rows to skip (default `0`).
  - _columns_: An ordered set of columns to include. The input may consist of: column name strings, column integer indices, objects with current column names as keys and new column names as values (for renaming), or a selection helper function such as [all](https://idl.uw.edu/arquero/api/#all), [not](https://idl.uw.edu/arquero/api/#not), or [range](https://idl.uw.edu/arquero/api/#range)).
  - _grouped_: The export format for groups of rows. This option only applies to tables with groups set with the [groupby](https://idl.uw.edu/arquero/api/verbs/#groupby) verb. The default (`false`) is to ignore groups, returning a flat array of objects. The valid values are `true` or `'map'` (for [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) instances), `'object'` (for standard [Objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)), or `'entries'` (for arrays in the style of [Object.entries](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries)). For the `'object'` format, groupby keys are coerced to strings to use as object property names; note that this can lead to undesirable behavior if the groupby key values do not coerce to unique strings. The `'map'` and `'entries'` options preserve the groupby key values.

_Examples_

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).objects();
// [ { a: 1, b: 4 }, { a: 2, b: 5 }, { a: 3, b: 6 } ]
```

```js
aq.table({ k: ['a', 'b', 'a'], v: [1, 2, 3] })
  .groupby('k')
  .objects({ grouped: true });
// new Map([
//   [ 'a', [ { k: 'a', v: 1 }, { k: 'a', v: 3 } ] ],
//   [ 'b', [ { k: 'b', v: 2 } ] ]
// ])
```

---

[#](https://idl.uw.edu/arquero/api/#object) _table_.**object** (\[_row_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Returns an object representing a single table row. The _row_ index is relative to any filtering and ordering criteria, not the internal data layout. If the _row_ index is not specified, the first row in the table (index `0`) is returned.

_Examples_

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).object(1); // { a: 2, b : 5}
```

```js
const { min, max } = aq
  .table({ v: [1, 2, 3] })
  .rollup({ min: op.min('v'), max: op.max('v') })
  .object(); // { min: 1, max: 3 }
```

---

[#](https://idl.uw.edu/arquero/api/#@@iterator) _table_ \[**Symbol.iterator**\]() · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Returns an iterator over generated row objects. Similar to the [objects](https://idl.uw.edu/arquero/api/#objects) method, this method generates new row object instances; however, rather than returning an array, this method provides an iterator over row objects for each non-filtered row in the table.

_Examples_

```js
for (const rowObject of table) {
  // do something with row object
}
```

```js
// slightly less efficient version of table.objects()
const objects = [...table];
```

---

[#](https://idl.uw.edu/arquero/api/#print) _table_.**print** (\[_options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/Table.js)

Print the contents of this table using the `console.table()` method.

- _options_: Options for printing. If number-valued, specifies the row limit (equivalent to `{ limit: value }`).
  - _limit_: The maximum number of rows to print (default `10`).
  - _offset_: The row offset indicating how many initial rows to skip (default `0`).
  - _columns_: An ordered set of columns to print. The input may consist of: column name strings, column integer indices, objects with current column names as keys and new column names as values (for renaming), or a selection helper function such as [all](https://idl.uw.edu/arquero/api/#all), [not](https://idl.uw.edu/arquero/api/#not), or [range](https://idl.uw.edu/arquero/api/#range)).

_Examples_

```js
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).print();
// ┌─────────┬───┬───┐
// │ (index) │ a │ b │
// ├─────────┼───┼───┤
// │    0    │ 1 │ 4 │
// │    1    │ 2 │ 5 │
// │    2    │ 3 │ 6 │
// └─────────┴───┴───┘
```

---

[#](https://idl.uw.edu/arquero/api/#toHTML) _table_.**toHTML** (\[_options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/to-html.js)

Format this table as an HTML table string.

- _options_: A formatting options object:
  - _limit_: The maximum number of rows to print (default `100`).
  - _offset_: The row offset indicating how many initial rows to skip (default `0`).
  - _columns_: Ordered list of column names to print. If function-valued, the function should accept a table as input and return an array of column name strings. Otherwise, should be an array of name strings.
  - _align_: Object of column alignment options. The object keys should be column names. The object values should be aligment strings, one of `'l'` (left), `'c'` (center), or `'r'` (right). If specified, these override any automatically inferred options.
  - _format_: Object of column format options. If specified, these override any automatically inferred options. The object keys should be column names. The object values should either be formatting functions or objects with any of the following properties:
    - _utc_: A boolean flag indicating if UTC date formatting should be used rather than the local time zone.
    - _digits_: Number of fractional digits to include for numbers.
  - _maxdigits_: The maximum number of fractional digits to include when inferring a number format (default `6`). This option is passed to the format inference method and is ignored when explicit format options are specified.
  - _null_: Optional format function for `null` and `undefined` values. If specified, this function be invoked with the `null` or `undefined` value as the sole input argument. The return value is then used as the HTML output for the input value.
  - _style_: CSS styles to include in HTML output. The object keys can be HTML table tag names: `'table'`, `'thead'`, `'tbody'`, `'tr'`, `'th'`, or `'td'`. The object values should be strings of valid CSS style directives (such as `"font-weight: bold;"`) or functions that take a column name and row as input and return a CSS string.

_Examples_

```js
// serialize a table as HTML-formatted text
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).toHTML();
```

---

[#](https://idl.uw.edu/arquero/api/#toMarkdown) _table_.**toMarkdown** (\[_options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/to-markdown.js)

Format this table as a [GitHub-Flavored Markdown table](https://github.github.com/gfm/#tables-extension-) string.

- _options_: A formatting options object:
  - _limit_: The maximum number of rows to print (default `100`).
  - _offset_: The row offset indicating how many initial rows to skip (default `0`).
  - _columns_: Ordered list of column names to print. If function-valued, the function should accept a table as input and return an array of column name strings. Otherwise, should be an array of name strings.
  - _align_: Object of column alignment options. The object keys should be column names. The object values should be aligment strings, one of `'l'` (left), `'c'` (center), or `'r'` (right). If specified, these override any automatically inferred options.
  - _format_: Object of column format options. If specified, these override any automatically inferred options. The object keys should be column names. The object values should either be formatting functions or objects with any of the following properties:
    - _utc_: A boolean flag indicating if UTC date formatting should be used rather than the local time zone.
    - _digits_: Number of fractional digits to include for numbers.
  - _maxdigits_: The maximum number of fractional digits to include when inferring a number format (default `6`). This option is passed to the format inference method and is ignored when explicit format options are specified.

_Examples_

```js
// serialize a table as Markdown-formatted text
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).toMarkdown();
// '|a|b|\n|-:|-:|\n|1|4|\n|2|5|\n|3|6|\n'
```

---

[#](https://idl.uw.edu/arquero/api/#toArrow) _table_.**toArrow** (\[_options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/to-arrow.js)

Format this table as an [Apache Arrow](https://arrow.apache.org/overview/) table instance using [Flechette](https://idl.uw.edu/flechette/). This method will throw an error if type inference fails or if the generated columns have differing lengths.

- _options_: Options for Arrow encoding.
  - _columns_: Ordered list of column names to include. If function-valued, the function should accept this table as a single argument and return an array of column name strings.
  - _limit_: The maximum number of rows to include (default `Infinity`).
  - _offset_: The row offset indicating how many initial rows to skip (default `0`).
  - _types_: An optional object indicating the [Arrow data type](https://idl.uw.edu/flechette/api/data-types) to use for named columns. If specified, the input should be an object with column names for keys and Arrow data types for values. Type values must be instantiated Flechette [DataType](https://idl.uw.edu/flechette/api/data-types) instances (for example, `float64()`,`dateDay()`, `list(int32())` _etc._). If a column’s data type is not explicitly provided, type inference will be performed.
  - _useBigInt_: Boolean flag (default `false`) to extract 64-bit integer types as JavaScript `BigInt` values. For Flechette tables, the default is to coerce 64-bit integers to JavaScript numbers and raise an error if the number is out of range. This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useDate_: Boolean flag (default `true`) to convert Arrow date and timestamp values to JavaScript Date objects. Otherwise, numeric timestamps are used. This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useDecimalBigInt_: Boolean flag (default `false`) to extract Arrow decimal-type data as BigInt values, where fractional digits are scaled to integers. Otherwise, decimals are (sometimes lossily) converted to floating-point numbers (default). This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useMap_: Boolean flag (default `false`) to represent Arrow Map data as JavaScript `Map` values. For Flechette tables, the default is to produce an array of `[key, value]` arrays. This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useProxy_: Boolean flag (default `false`) to extract Arrow Struct values and table row objects using zero-copy proxy objects that extract data from underlying Arrow batches. The proxy objects can improve performance and reduce memory usage, but do not support property enumeration (`Object.keys`, `Object.values`, `Object.entries`) or spreading (`{ ...object }`). This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.

_Examples_

Encode Arrow data from an input Arquero table:

```js
import { float32, uint16 } from '@uwdata/flechette';
import { table } from 'arquero';

// create Arquero table
const dt = table({
  x: [1, 2, 3, 4, 5],
  y: [3.4, 1.6, 5.4, 7.1, 2.9],
});

// encode as an Arrow table (infer data types)
// here, infers Uint8 for 'x' and Float64 for 'y'
const at1 = dt.toArrow();

// encode into Arrow table (set explicit data types)
const at2 = dt.toArrow({
  types: {
    x: uint16(),
    y: float32(),
  },
});
```

---

[#](https://idl.uw.edu/arquero/api/#toArrowIPC) _table_.**toArrowIPC** (\[_options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/to-arrow-ipc.js)

Format this table as binary data in the [Apache Arrow](https://arrow.apache.org/overview/) IPC format using [Flechette](https://idl.uw.edu/flechette/). The binary data may be saved to disk or passed between processes or tools. For example, when using [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers), the output of this method can be passed directly between threads (no data copy) as a [Transferable](https://developer.mozilla.org/en-US/docs/Web/API/Transferable) object. Additionally, Arrow binary data can be loaded in other language environments such as [Python](https://arrow.apache.org/docs/python/) or [R](https://arrow.apache.org/docs/r/).

This method will throw an error if type inference fails or if the generated columns have differing lengths.

- _options_: Options for Arrow encoding, same as [toArrow](https://idl.uw.edu/arquero/api/#toArrow) but with an additional _format_ option.
  - _format_: The Arrow IPC byte format to use. One of `'stream'` (default) or `'file'`. For more details on these formats, see the [Apache Arrow format documentation](https://arrow.apache.org/docs/format/Columnar.html#ipc-streaming-format).

_Examples_

Encode Arrow data from an input Arquero table:

```js
import { table } from 'arquero';

const dt = table({
  x: [1, 2, 3, 4, 5],
  y: [3.4, 1.6, 5.4, 7.1, 2.9],
});

// encode table as a transferable Arrow byte buffer
// here, infers int8 for 'x' and float64 for 'y'
const bytes = dt.toArrowIPC();
```

---

[#](https://idl.uw.edu/arquero/api/#toCSV) _table_.**toCSV** (\[_options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/to-csv.js)

Format this table as a comma-separated values (CSV) string. Other delimiters, such as tabs or pipes (‘|’), can be specified using the _options_ argument.

- _options_: A formatting options object:
  - _delimiter_: The delimiter between values (default `","`).
  - _header_: Boolean flag (default `true`) to specify the presence of a header row. If `true`, includes a header row with column names. If `false`, the header is omitted.
  - _limit_: The maximum number of rows to print (default `Infinity`).
  - _offset_: The row offset indicating how many initial rows to skip (default `0`).
  - _columns_: Ordered list of column names to include. If function-valued, the function should accept a table as input and return an array of column name strings. Otherwise, should be an array of name strings.
  - _format_: Object of column format options. The object keys should be column names. The object values should be formatting functions that transform column values prior to output. If specified, a formatting function overrides any automatically inferred options.

_Examples_

```js
// serialize a table as CSV-formatted text
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).toCSV();
// 'a,b\n1,4\n2,5\n3,6'
```

---

[#](https://idl.uw.edu/arquero/api/#toJSON) _table_.**toJSON** (\[_options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/to-json.js)

Format this table as a JavaScript Object Notation (JSON) string compatible with the [fromJSON](https://idl.uw.edu/#fromJSON) method.

- _options_: A formatting options object:
  - _type_ (`'columns' | 'rows' | 'ndjson' | null`): The JSON format type. One of `'columns'` (for an object with named column arrays)`, 'rows'` (for an array for row objects), or `'ndjson'` for [newline-delimited JSON](https://github.com/ndjson/ndjson-spec) rows. For `'ndjson'`, each line of text will contain a JSON row object (with no trailing comma) and string properties will be stripped of any newline characters. If no format type is specified, defaults to `'rows'`.
  - _limit_ (`number`): The maximum number of rows to print (default `Infinity`).
  - _offset_ (`number`): The row offset indicating how many initial rows to skip (default `0`).
  - _columns_ (`string[] | function`): Ordered list of column names to include. If function-valued, the function should accept a table as input and return an array of column name strings. Otherwise, should be an array of name strings.
  - _format_ (`Record<string, function>`): Object of column format options. The object keys should be column names. The object values should be formatting functions that transform column values prior to output. If specified, a formatting function overrides any automatically inferred options.

_JSON Format Types_

`'columns'`: column-oriented JSON as an object-of-arrays.

```json
{
  "colA": ["a", "b", "c"],
  "colB": [1, 2, 3]
}
```

`'rows'`: row-oriented JSON as an array-of-objects.

```json
[
  { "colA": "a", "colB": 1 },
  { "colA": "b", "colB": 2 },
  { "colA": "c", "colB": 3 }
]
```

`'ndjson'`: newline-delimited JSON as individual objects separated by newline.

```json
{"colA": "a", "colB": 1}
{"colA": "b", "colB": 2}
{"colA": "c", "colB": 3}
```

_Examples_

```js
// serialize a table as a row-oriented JSON string
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).toJSON();
// '[{"a":1,"b":4},{"a":2,"b":5},{"a":3,"b":6}]'
```

```js
// serialize a table as a column-oriented JSON string
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).toJSON({ type: 'columns' });
// '{"a":[1,2,3],"b":[4,5,6]}'
```

```js
// serialize a table as a newline-delimited JSON string
aq.table({ a: [1, 2, 3], b: [4, 5, 6] }).toJSON({ type: 'ndjson' });
// '{"a":1,"b":4}\n{"a":2,"b":5}\n{"a":3,"b":6}'
```
