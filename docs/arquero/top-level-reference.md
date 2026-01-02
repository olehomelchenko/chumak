---
title: 'Arquero API Reference'
source: 'https://idl.uw.edu/arquero/api/'
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

| [**Top-Level**](https://idl.uw.edu/arquero/api) | [Table](https://idl.uw.edu/arquero/api/table) | [Verbs](https://idl.uw.edu/arquero/api/verbs) | [Op Functions](https://idl.uw.edu/arquero/api/op) | [Expressions](https://idl.uw.edu/arquero/api/expressions) | [Extensibility](https://idl.uw.edu/arquero/api/extensibility) |
| ----------------------------------------------- | --------------------------------------------- | --------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |

- [Table Constructors](https://idl.uw.edu/arquero/api/#table-constructors)
  - [table](https://idl.uw.edu/arquero/api/#table), [from](https://idl.uw.edu/arquero/api/#from)
- [Table Input](https://idl.uw.edu/arquero/api/#input)
  - [loadArrow](https://idl.uw.edu/arquero/api/#loadArrow), [loadCSV](https://idl.uw.edu/arquero/api/#loadCSV), [loadFixed](https://idl.uw.edu/arquero/api/#loadFixed), [loadJSON](https://idl.uw.edu/arquero/api/#loadJSON)
  - [fromArrow](https://idl.uw.edu/arquero/api/#fromArrow), [fromCSV](https://idl.uw.edu/arquero/api/#fromCSV), [fromFixed](https://idl.uw.edu/arquero/api/#fromFixed), [fromJSON](https://idl.uw.edu/arquero/api/#fromJSON)
  - [fromArrowStream](https://idl.uw.edu/arquero/api/#fromArrowStream), [fromCSVStream](https://idl.uw.edu/arquero/api/#fromCSVStream), [fromFixedStream](https://idl.uw.edu/arquero/api/#fromFixedStream), [fromJSONStream](https://idl.uw.edu/arquero/api/#fromJSONStream)
- [Expression Helpers](https://idl.uw.edu/arquero/api/#expression-helpers)
  - [op](https://idl.uw.edu/arquero/api/#op), [agg](https://idl.uw.edu/arquero/api/#agg), [escape](https://idl.uw.edu/arquero/api/#escape)
  - [bin](https://idl.uw.edu/arquero/api/#bin), [collate](https://idl.uw.edu/arquero/api/#collate), [desc](https://idl.uw.edu/arquero/api/#desc), [frac](https://idl.uw.edu/arquero/api/#frac), [rolling](https://idl.uw.edu/arquero/api/#rolling), [seed](https://idl.uw.edu/arquero/api/#seed)
- [Selection Helpers](https://idl.uw.edu/arquero/api/#selection-helpers)
  - [all](https://idl.uw.edu/arquero/api/#all), [not](https://idl.uw.edu/arquero/api/#not), [range](https://idl.uw.edu/arquero/api/#range)
  - [matches](https://idl.uw.edu/arquero/api/#matches), [startswith](https://idl.uw.edu/arquero/api/#startswith), [endswith](https://idl.uw.edu/arquero/api/#endswith)
  - [names](https://idl.uw.edu/arquero/api/#names)

## Table Constructors

Methods for creating new table instances.

---

[#](https://idl.uw.edu/arquero/api/#table) _aq_.**table** (_columns_ \[, _names_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/index.js)

Create a new [table](https://idl.uw.edu/arquero/api/table) for a set of named _columns_, optionally including an array of ordered column _names_. The _columns_ input can be an object or Map with names for keys and columns for values, or an entry array of `[name, values]` tuples.

JavaScript objects have specific key ordering rules: keys are enumerated in the order they are assigned, except for integer keys, which are enumerated first in sorted order. As a result, when using a standard object any _columns_ entries with integer keys are listed first regardless of their order in the object definition. Use the _names_ argument to ensure proper column ordering is respected. Map and entry arrays will preserve name ordering, in which case the _names_ argument is only needed if you wish to specify an ordering different from the _columns_ input.

To bind together columns from multiple tables with the same number of rows, use the table [assign](https://idl.uw.edu/arquero/api/table#assign) method. To transform the table, use the various [verb](https://idl.uw.edu/arquero/api/verbs) methods.

- _columns_: An object or Map providing a named set of column arrays, or an entries array of the form `[[name, values], ...]`. Keys are column name strings; the enumeration order of the keys determines the column indices if the _names_ argument is not provided. Column values should be arrays (or array-like values) of identical length.
- _names_: An array of column names, specifying the index order of columns in the table.

_Examples_

```js
// create a new table with 2 columns and 3 rows
aq.table({ colA: ['a', 'b', 'c'], colB: [3, 4, 5] });
```

```js
// create a new table, preserving column order for integer names
aq.table({ key: ['a', 'b'], 1: [9, 8], 2: [7, 6] }, ['key', '1', '2']);
```

```js
// create a new table from a Map instance
const map = new Map().set('colA', ['a', 'b', 'c']).set('colB', [3, 4, 5]);
aq.table(map);
```

---

[#](https://idl.uw.edu/arquero/api/#from) _aq_.**from** (_values_ \[, _names_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/table/index.js)

Create a new [table](https://idl.uw.edu/arquero/api/table) from an existing object, such as an array of objects or a set of key-value pairs. For varied JSON formats, see the [`fromJSON`](https://idl.uw.edu/arquero/api/#fromJSON) method.

- _values_: Data values to populate the table. If array-valued or iterable, imports rows for each non-null value, using the provided column names as keys for each row object. If no _names_ are provided, the first non-null object’s own keys are used. If an object or a Map, create a two-column table with columns for the input keys and values.
- _names_: Column names to include. For object or Map inputs, specifies the key and value column names. Otherwise, specifies the keys to look up on each row object.

_Examples_

```js
// from an array, create a new table with two columns and two rows
// akin to table({ colA: [1, 3], colB: [2, 4] })
aq.from([
  { colA: 1, colB: 2 },
  { colA: 3, colB: 4 },
]);
```

```js
// from an object, create a new table with 'key' and 'value columns
// akin to table({ key: ['a', 'b', 'c'], value: [1, 2, 3] })
aq.from({ a: 1, b: 2, c: 3 });
```

```js
// from a Map, create a new table with 'key' and 'value' columns
// akin to table({ key: ['d', 'e', 'f'], value: [4, 5, 6] })
aq.from(new Map([ ['d', 4], ['e', 5], ['f', 6] ])
```

## Table Input

Methods for loading files and parsing data formats to create new table instances.

---

[#](https://idl.uw.edu/arquero/api/#loadArrow) _aq_.**loadArrow** (_url_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/from-arrow.js)

Load a file in the [Apache Arrow](https://arrow.apache.org/overview/) IPC binary format from a _url_ and return a Promise for a [table](https://idl.uw.edu/arquero/api/table). Both the [Arrow IPC `stream` and `file` formats](https://arrow.apache.org/docs/format/Columnar.html#ipc-streaming-format) are supported; the format type is determined automatically.

When invoked in the browser, the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) is used to load the _url_. When invoked in node.js, the _url_ argument can also be a local file path. If the input _url_ string has a network protocol at the beginning (e.g., `'http://'`, `'https://'`, _etc_.) it is treated as a URL and `fetch` is used. If the `'file://'` protocol is used, the rest of the string should be an absolute file path, from which a local file is loaded. Otherwise the input is treated as a path to a local file and opened using the node.js `fs` module.

- _url_ (`string`): The url or local file path (node.js only) to load.
- _options_: File loading and Arrow formatting options.
  - _fetch_ ([`RequestInit`](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit)): Options to pass to the HTTP fetch method when loading a URL.
  - _decompress_ (`'gzip' | 'deflate' | null`): A decompression format to apply. If unspecified, the decompression type is inferred from the file extension (`.gz` for `'gzip'`, `.zz` for `'deflate'`). If no matching extension is found, no decompression is performed.
  - _columns_ (`Select`): An ordered set of columns to import. The input may consist of: column name strings, column integer indices, objects with current column names as keys and new column names as values (for renaming), or a selection helper function such as [all](https://idl.uw.edu/arquero/api/#all), [not](https://idl.uw.edu/arquero/api/#not), or [range](https://idl.uw.edu/arquero/api/#range).
  - _useBigInt_ (`boolean`): Boolean flag (default `false`) to extract 64-bit integer types as JavaScript `BigInt` values. For Flechette tables, the default is to coerce 64-bit integers to JavaScript numbers and raise an error if the number is out of range. This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useDate_ (`boolean`): Boolean flag (default `true`) to convert Arrow date and timestamp values to JavaScript Date objects. Otherwise, numeric timestamps are used. This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useDecimalBigInt_ (`boolean`): Boolean flag (default `false`) to extract Arrow decimal-type data as BigInt values, where fractional digits are scaled to integers. Otherwise, decimals are (sometimes lossily) converted to floating-point numbers (default). This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useMap_ (`boolean`): Boolean flag (default `false`) to represent Arrow Map data as JavaScript `Map` values. For Flechette tables, the default is to produce an array of `[key, value]` arrays. This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useProxy_ (`boolean`): Boolean flag (default `false`) to extract Arrow Struct values and table row objects using zero-copy proxy objects that extract data from underlying Arrow batches. The proxy objects can improve performance and reduce memory usage, but do not support property enumeration (`Object.keys`, `Object.values`, `Object.entries`) or spreading (`{ ...object }`). This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.

_Examples_

```js
// load table from an Apache Arrow file
const dt = await aq.loadArrow('data/table.arrow');
```

---

[#](https://idl.uw.edu/arquero/api/#loadCSV) _aq_.**loadCSV** (_url_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/from-csv.js)

Load a comma-separated values (CSV) file from a _url_ and return a Promise for a [table](https://idl.uw.edu/arquero/api/table). Delimiters other than commas, such as tabs or pipes (‘|’), can be specified using the _options_ argument. By default, automatic type inference is performed for input values; string values that match the [ISO standard date format](https://en.wikipedia.org/wiki/ISO_8601) are parsed into JavaScript Date objects. To disable this behavior set _options.autoType_ to `false`, which will cause all columns to be loaded as strings. To perform custom parsing of input column values, use _options.parse_.

When invoked in the browser, the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) is used to load the _url_. When invoked in node.js, the _url_ argument can also be a local file path. If the input _url_ string has a network protocol at the beginning (e.g., `'http://'`, `'https://'`, _etc_.) it is treated as a URL and `fetch` is used. If the `'file://'` protocol is used, the rest of the string should be an absolute file path, from which a local file is loaded. Otherwise the input is treated as a path to a local file and loaded using the node.js `fs` module. In either case, stream processing is used to load the data while minimizing memory usage.

- _url_ (`string`): The url or local file (node.js only) to load.
- _options_: File loading and CSV formatting options.
  - _fetch_ ([`RequestInit`](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit)): Options to pass to the HTTP fetch method when loading a URL.
  - _decompress_ (`'gzip' | 'deflate' | null`): A decompression format to apply. If unspecified, the decompression type is inferred from the file extension (`.gz` for `'gzip'`, `.zz` for `'deflate'`). If no matching extension is found, no decompression is performed.
  - _delimiter_ (`string`): A single-character delimiter string between column values (default `','`).
  - _decimal_ (`string`): A single-character numeric decimal separator (default `'.'`).
  - _header_ (`boolean`): Boolean flag (default `true`) to specify the presence of a header row. If `true`, indicates the CSV contains a header row with column names. If `false`, indicates the CSV does not contain a header row and the columns are given the names `'col1'`, `'col2'`, etc unless the _names_ option is specified.
  - _names_ (`string[]`): An array of column names to use for header-less CSV files. This option is ignored if the _header_ option is `true`.
  - _skip_ (`number`): The number of lines to skip (default `0`) before reading data.
  - _comment_ (`string`): A string used to identify comment lines. Any lines that start with the comment pattern are skipped.
  - _autoType_ (`true`): Boolean flag (default `true`) for automatic type inference.
  - _autoMax_ (`number`): Maximum number of initial rows (default `1000`) to use for type inference.
  - _parse_ (`Record<string, function>`): Object of column parsing options. The object keys should be column names. The object values should be parsing functions to invoke to transform values upon input.

_Examples_

```js
// load table from a CSV file
const dt = await aq.loadCSV('data/table.csv');
```

```js
// load table from a gzip-compressed CSV file
// the { decompress: 'gzip' } option is inferred from the file extension
const dt = await aq.loadCSV('data/table.csv.gz');
```

```js
// load table from a tab-delimited file
const dt = await aq.loadCSV('data/table.tsv', { delimiter: '\t' });
```

---

[#](https://idl.uw.edu/arquero/api/#loadFixed) _aq_.**loadFixed** (_url_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/from-fixed.js)

Load a fixed-width file from a _url_ and return a Promise for a [table](https://idl.uw.edu/arquero/api/table). By default, automatic type inference is performed for input values; string values that match the [ISO standard date format](https://en.wikipedia.org/wiki/ISO_8601) are parsed into JavaScript Date objects. To disable this behavior set the _autoType_ option to `false`, which will cause all columns to be loaded as strings. To perform custom parsing of input column values, use the _parse_ option.

When invoked in the browser, the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) is used to load the _url_. When invoked in node.js, the _url_ argument can also be a local file path. If the input _url_ string has a network protocol at the beginning (e.g., `'http://'`, `'https://'`, _etc_.) it is treated as a URL and `fetch` is used. If the `'file://'` protocol is used, the rest of the string should be an absolute file path, from which a local file is loaded. Otherwise the input is treated as a path to a local file and loaded using the node.js `fs` module. In either case, stream processing is used to load the data while minimizing memory usage.

- _url_ (`string`): The url or local file (node.js only) to load.
- _options_: File loading and fixed-width formatting options.
  - _fetch_ ([`RequestInit`](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit)): Options to pass to the HTTP fetch method when loading a URL.
  - _decompress_ (`'gzip' | 'deflate' | null`): A decompression format to apply. If unspecified, the decompression type is inferred from the file extension (`.gz` for `'gzip'`, `.zz` for `'deflate'`). If no matching extension is found, no decompression is performed.
  - _positions_ (`[number, number][]`): Array of \[start, end\] indices for fixed-width columns.
  - _widths_ (`number[]`): Array of fixed column widths. This option is ignored if the _positions_ property is specified.
  - _names_ (`string[]`): An array of column names. The array length should match the length of the _positions_ or _widths_ array. If not specified or shorter than the other array, default column names are generated.
  - _decimal_ (`string`): A single-character numeric decimal separator (default `'.'`).
  - _skip_ (`number`): The number of lines to skip (default `0`) before reading data.
  - _comment_ (`string`): A string used to identify comment lines. Any lines that start with the comment pattern are skipped.
  - _autoType_ (`boolean`): Boolean flag (default `true`) for automatic type inference.
  - _autoMax_ (`number`): Maximum number of initial rows (default `1000`) to use for type inference.
  - _parse_ (`Record<string, function>`): Object of column parsing options. The object keys should be column names. The object values should be parsing functions to invoke to transform values upon input.

_Examples_

```js
// load table from a fixed-width file
const dt = await aq.loadFixed('data/fixed-width.txt', { widths: [1, 1], names: ['u', 'v'] });
```

---

[#](https://idl.uw.edu/arquero/api/#loadJSON) _aq_.**loadJSON** (_url_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/from-json.js)

Load a JavaScript Object Notation (JSON) file from a _url_ and return a Promise for a [table](https://idl.uw.edu/arquero/api/table). If the _type_ option is unspecified and the loaded JSON is array-valued, an array-of-objects format is assumed. If object-valued, a column-oriented format is assumed. See the [parseJSON](https://idl.uw.edu/arquero/api/#parseJSON) method for format type examples.

By default, string values that match the [ISO standard date format](https://en.wikipedia.org/wiki/ISO_8601) are parsed into JavaScript Date objects. To disable this behavior, set the _autoType_ option to `false`. To perform custom parsing of input column values, use the _parse_ option. Auto-type Date parsing is not performed for columns with custom parse options.

When invoked in the browser, the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) is used to load the _url_. When invoked in node.js, the _url_ argument can also be a local file path. If the input _url_ string has a network protocol at the beginning (e.g., `'http://'`, `'https://'`, _etc_.) it is treated as a URL and `fetch` is used. If the `'file://'` protocol is used, the rest of the string should be an absolute file path, from which a local file is loaded. Otherwise the input is treated as a path to a local file and loaded using the node.js `fs` module. For the `'ndjson'` format _type_, stream processing is used to load the data while minimizing memory usage.

- _url_ (`string`): The url or local file (node.js only) to load.
- _options_: File loading and JSON formatting options.
  - _fetch_ ([`RequestInit`](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit)): Options to pass to the HTTP fetch method when loading a URL.
  - _decompress_ (`'gzip' | 'deflate' | null`): A decompression format to apply. If unspecified, the decompression type is inferred from the file extension (`.gz` for `'gzip'`, `.zz` for `'deflate'`). If no matching extension is found, no decompression is performed.
  - _type_ (`'columns' | 'rows' | 'ndjson' | null`): The JSON format type. One of `'columns'` (for an object with named column arrays)`, 'rows'` (for an array for row objects), or `'ndjson'` for [newline-delimited JSON](https://github.com/ndjson/ndjson-spec) rows. For `'ndjson'`, each line of text must contain a JSON row object (with no trailing comma) and string properties must not contain any newline characters. If no format type is specified, one of `'rows'` or `'columns'` is inferred from the structure of the parsed JSON.
  - _columns_ (`string[]`): An array of column names to include. JSON properties missing from this list are not included in the table.
  - _skip_ (`number`): The number of lines to skip (default `0`) before reading data. Applicable to the `'ndjson'` type only.
  - _comment_ (`string`): A string used to identify comment lines. Any lines that start with the comment pattern are skipped. Applicable to the `ndjson` type only.
  - _autoType_ (`boolean`): Boolean flag (default `true`) for automatic type inference. If `false`, automatic date parsing for input JSON strings is disabled.
  - _parse_ (`Record<string, function>`): Object of column parsing options. The object keys should be column names. The object values should be parsing functions to invoke to transform values upon input.

_Examples_

```js
// load table from a JSON file
const dt = await aq.loadJSON('data/table.json');
```

```js
// load table from a JSON file, disable Date autoType
const dt = await aq.loadJSON('data/table.json', { autoType: false });
```

---

[#](https://idl.uw.edu/arquero/api/#fromArrow) _aq_.**fromArrow** (_input_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/from-arrow.js)

Returns a new [table](https://idl.uw.edu/arquero/api/table) backed by [Apache Arrow](https://arrow.apache.org/) binary data. The _input_ can be a byte array in the Arrow IPC format, or an instantiated [Flechette](https://github.com/uwdata/flechette) or [Apache Arrow JS](https://arrow.apache.org/docs/js/) table instance. Binary inputs are decoded using [Flechette](https://github.com/uwdata/flechette).

For many data types, Arquero uses binary-encoded Arrow columns as-is with zero data copying. For dictionary columns, Arquero unpacks columns with `null` entries or containing multiple record batches to optimize query performance.

Both the [Arrow IPC `stream` and `file` formats](https://arrow.apache.org/docs/format/Columnar.html#ipc-streaming-format) are supported; the format type is determined automatically. This method performs parsing only. To specify a URL or file to load, use [loadArrow](https://idl.uw.edu/arquero/api/#loadArrow).

- _input_: A byte array (e.g., [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) or [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array)) in the Arrow IPC format, or a [Flechette](https://github.com/uwdata/flechette) or [Apache Arrow JS](https://arrow.apache.org/docs/js/) table instance.
- _options_: An Arrow import options object.
  - _columns_ (`Select`): An ordered set of columns to import. The input may consist of: column name strings, column integer indices, objects with current column names as keys and new column names as values (for renaming), or a selection helper function such as [all](https://idl.uw.edu/arquero/api/#all), [not](https://idl.uw.edu/arquero/api/#not), or [range](https://idl.uw.edu/arquero/api/#range).
  - _useBigInt_ (`boolean`): Boolean flag (default `false`) to extract 64-bit integer types as JavaScript `BigInt` values. For Flechette tables, the default is to coerce 64-bit integers to JavaScript numbers and raise an error if the number is out of range. This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useDate_ (`boolean`): Boolean flag (default `true`) to convert Arrow date and timestamp values to JavaScript Date objects. Otherwise, numeric timestamps are used. This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useDecimalBigInt_ (`boolean`): Boolean flag (default `false`) to extract Arrow decimal-type data as BigInt values, where fractional digits are scaled to integers. Otherwise, decimals are (sometimes lossily) converted to floating-point numbers (default). This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useMap_ (`boolean`): Boolean flag (default `false`) to represent Arrow Map data as JavaScript `Map` values. For Flechette tables, the default is to produce an array of `[key, value]` arrays. This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useProxy_ (`boolean`): Boolean flag (default `false`) to extract Arrow Struct values and table row objects using zero-copy proxy objects that extract data from underlying Arrow batches. The proxy objects can improve performance and reduce memory usage, but do not support property enumeration (`Object.keys`, `Object.values`, `Object.entries`) or spreading (`{ ...object }`). This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.

_Examples_

```js
// encode input table as Arrow IPC bytes
const arrowBytes = aq
  .table({
    x: [1, 2, 3, 4, 5],
    y: [3.4, 1.6, 5.4, 7.1, 2.9],
  })
  .toArrowIPC();

// access the Arrow-encoded data as an Arquero table
const dt = aq.fromArrow(arrowBytes);
```

---

[#](https://idl.uw.edu/arquero/api/#parseCSV) _aq_.**fromCSV** (_input_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/from-csv.js)

Parse a comma-separated values (CSV) _input_ and return a [table](https://idl.uw.edu/arquero/api/table). Delimiters other than commas, such as tabs or pipes (‘|’), can be specified using the _delimiter_ option. By default, automatic type inference is performed for input values; string values that match the [ISO standard date format](https://en.wikipedia.org/wiki/ISO_8601) are parsed into JavaScript Date objects. To disable this behavior set _autoType_ option to `false`, which will cause all columns to be loaded as strings. To perform custom parsing of input column values, use the _parse_ option.

This method performs parsing only. To specify a URL or file to load, use [loadCSV](https://idl.uw.edu/arquero/api/#loadCSV).

- _input_ (`string`): A text string in a delimited-value format.
- _options_: A CSV format options object.
  - _delimiter_ (`string`): A single-character delimiter string between column values (default `','`).
  - _decimal_ (`string`): A single-character numeric decimal separator (default `'.'`).
  - _header_ (`boolean`): Boolean flag (default `true`) to specify the presence of a header row. If `true`, indicates the CSV contains a header row with column names. If `false`, indicates the CSV does not contain a header row and the columns are given the names `'col1'`, `'col2'`, etc unless the _names_ option is specified.
  - _names_ (`string[]`): An array of column names to use for header-less CSV files. This option is ignored if the _header_ option is `true`.
  - _skip_ (`number`): The number of lines to skip (default `0`) before reading data.
  - _comment_ (`string`): A string used to identify comment lines. Any lines that start with the comment pattern are skipped.
  - _autoType_ (`true`): Boolean flag (default `true`) for automatic type inference.
  - _autoMax_ (`number`): Maximum number of initial rows (default `1000`) to use for type inference.
  - _parse_ (`Record<string, function>`): Object of column parsing options. The object keys should be column names. The object values should be parsing functions to invoke to transform values upon input.

_Examples_

```js
// create table from an input CSV string
// akin to table({ a: [1, 3], b: [2, 4] })
aq.fromCSV('a,b\n1,2\n3,4');
```

```js
// skip commented lines
aq.fromCSV('# a comment\na,b\n1,2\n3,4', { comment: '#' });
```

```js
// skip the first line
aq.fromCSV('# a comment\na,b\n1,2\n3,4', { skip: 1 });
```

```js
// override autoType with custom parser for column 'a'
// akin to table({ a: ['00152', '30219'], b: [2, 4] })
aq.fromCSV('a,b\n00152,2\n30219,4', { parse: { a: String } });
```

```js
// parse semi-colon delimited text with comma as decimal separator
aq.fromCSV('a;b\nu;-1,23\nv;3,45e5', { delimiter: ';', decimal: ',' });
```

```js
// create table from an input CSV loaded from 'url'
// for performant stream-based parsing, use the loadCSV method
aq.fromCSV(await fetch(url).then((res) => res.text()));
```

---

[#](https://idl.uw.edu/arquero/api/#fromFixed) _aq_.**fromFixed** (_input_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/from-fixed.js)

Parse a fixed-width file _input_ and a [table](https://idl.uw.edu/arquero/api/table). By default, automatic type inference is performed for input values; string values that match the [ISO standard date format](https://en.wikipedia.org/wiki/ISO_8601) are parsed into JavaScript Date objects. To disable this behavior set _options.autoType_ to `false`, which will cause all columns to be loaded as strings. To perform custom parsing of input column values, use _options.parse_.

This method performs parsing only. To specify a URL or file to load, use [loadFixed](https://idl.uw.edu/arquero/api/#loadFixed).

- _input_ (`string`): A text string in a fixed-width format.
- _options_: A fixed-width format options object.
  - _positions_ (`[number, number][]`): Array of \[start, end\] indices for fixed-width columns.
  - _widths_ (`number[]`): Array of fixed column widths. This option is ignored if the _positions_ property is specified.
  - _names_ (`string[]`): An array of column names. The array length should match the length of the _positions_ or _widths_ array. If not specified or shorter than the other array, default column names are generated.
  - _decimal_ (`string`): A single-character numeric decimal separator (default `'.'`).
  - _skip_ (`number`): The number of lines to skip (default `0`) before reading data.
  - _comment_ (`string`): A string used to identify comment lines. Any lines that start with the comment pattern are skipped.
  - _autoType_ (`boolean`): Boolean flag (default `true`) for automatic type inference.
  - _autoMax_ (`number`): Maximum number of initial rows (default `1000`) to use for type inference.
  - _parse_ (`Record<string, function>`): Object of column parsing options. The object keys should be column names. The object values should be parsing functions to invoke to transform values upon input.

_Examples_

```js
// create table from an input fixed-width string
// akin to table({ u: ['a', 'b'], v: [1, 2] })
aq.fromFixed('a1\nb2', { widths: [1, 1], names: ['u', 'v'] });
```

---

[#](https://idl.uw.edu/arquero/api/#fromJSON) _aq_.**fromJSON** (_input_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/from-json.js)

Parse JavaScript Object Notation (JSON) _input_ into and return a [table](https://idl.uw.edu/arquero/api/table). String values in JSON column arrays that match the [ISO standard date format](https://en.wikipedia.org/wiki/ISO_8601) are parsed into JavaScript Date objects. To disable this behavior, set the _autoType_ option to `false`. To perform custom parsing of input column values, use the _parse_ option. Auto-type Date parsing is not performed for columns with custom parse options.

This method performs parsing only. To specify a URL or file to load, use [loadJSON](https://idl.uw.edu/arquero/api/#loadJSON). Additionally, the [table](https://idl.uw.edu/arquero/api/#table) reads pre-parsed column-oriented JSON data into an Arquero table without type inference, while the [from](https://idl.uw.edu/arquero/api/#from) method similarly maps pre-parsed row-oriented JSON data into an Arquero table.

- | _input_ (`string` | `object[]` | `object`): A string in a supported JSON format or pre-parsed JSON data. |
  | ----------------- | ---------- | ----------------------------------------------------------------------- |
- _options_: A JSON format options object:
  - _type_ (`'columns' | 'rows' | 'ndjson' | null`): The JSON format type. One of `'columns'` (for an object with named column arrays)`, 'rows'` (for an array for row objects), or `'ndjson'` for [newline-delimited JSON](https://github.com/ndjson/ndjson-spec) rows. For `'ndjson'`, each line of text must contain a JSON row object (with no trailing comma) and string properties must not contain any newline characters. If no format type is specified, one of `'rows'` or `'columns'` is inferred from the structure of the parsed JSON.
  - _columns_ (`string[]`): An array of column names to include. JSON properties missing from this list are not included in the table.
  - _skip_ (`number`): The number of lines to skip (default `0`) before reading data. Applicable to the `'ndjson'` type only.
  - _comment_ (`string`): A string used to identify comment lines. Any lines that start with the comment pattern are skipped. Applicable to the `ndjson` type only.
  - _autoType_ (`boolean`): Boolean flag (default `true`) for automatic type inference. If `false`, automatic date parsing for input JSON strings is disabled.
  - _parse_ (`Record<string, function>`): Object of column parsing options. The object keys should be column names. The object values should be parsing functions to invoke to transform values upon input.

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
// create table from an input JSON string
// akin to table({ a: [1, 3], b: [2, 4] })
aq.fromJSON('{"a":[1,3],"b":[2,4]}');
```

```js
// create table from an input JSON string loaded from 'url'
aq.fromJSON(await fetch(url).then((res) => res.text()));
```

```js
// create table from an input JSON object loaded from 'url'
// disable autoType Date parsing
aq.fromJSON(await fetch(url).then((res) => res.json()), { autoType: false });
```

---

[#](https://idl.uw.edu/arquero/api/#fromArrowStream) _aq_.**fromArrowStream** (_stream_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/from-arrow.js)

Returns a Promise to a new [table](https://idl.uw.edu/arquero/api/table) backed by [Apache Arrow](https://arrow.apache.org/) binary data. The _stream_ must be a ReadableStream of bytes, which is then decoded using [Flechette](https://github.com/uwdata/flechette).

For many data types, Arquero uses binary-encoded Arrow columns as-is with zero data copying. For dictionary columns, Arquero unpacks columns with `null` entries or containing multiple record batches to optimize query performance.

Both the [Arrow IPC `stream` and `file` formats](https://arrow.apache.org/docs/format/Columnar.html#ipc-streaming-format) are supported; the format type is determined automatically. This method performs parsing only. To specify a URL or file to load, use [loadArrow](https://idl.uw.edu/arquero/api/#loadArrow).

- _stream_: A [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) of bytes.
- _options_: An Arrow import options object.
  - _columns_ (`Select`): An ordered set of columns to import. The input may consist of: column name strings, column integer indices, objects with current column names as keys and new column names as values (for renaming), or a selection helper function such as [all](https://idl.uw.edu/arquero/api/#all), [not](https://idl.uw.edu/arquero/api/#not), or [range](https://idl.uw.edu/arquero/api/#range).
  - _useBigInt_ (`boolean`): Boolean flag (default `false`) to extract 64-bit integer types as JavaScript `BigInt` values. For Flechette tables, the default is to coerce 64-bit integers to JavaScript numbers and raise an error if the number is out of range. This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useDate_ (`boolean`): Boolean flag (default `true`) to convert Arrow date and timestamp values to JavaScript Date objects. Otherwise, numeric timestamps are used. This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useDecimalBigInt_ (`boolean`): Boolean flag (default `false`) to extract Arrow decimal-type data as BigInt values, where fractional digits are scaled to integers. Otherwise, decimals are (sometimes lossily) converted to floating-point numbers (default). This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useMap_ (`boolean`): Boolean flag (default `false`) to represent Arrow Map data as JavaScript `Map` values. For Flechette tables, the default is to produce an array of `[key, value]` arrays. This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.
  - _useProxy_ (`boolean`): Boolean flag (default `false`) to extract Arrow Struct values and table row objects using zero-copy proxy objects that extract data from underlying Arrow batches. The proxy objects can improve performance and reduce memory usage, but do not support property enumeration (`Object.keys`, `Object.values`, `Object.entries`) or spreading (`{ ...object }`). This option is only applied when parsing IPC binary data, otherwise the settings of the provided table instance are used.

_Examples_

```js
// load table from an Apache Arrow file
const dt = await aq.fromArrowStream(byteStream);
```

---

[#](https://idl.uw.edu/arquero/api/#fromCSVStream) _aq_.**fromCSVStream** (_stream_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/from-csv.js)

Parse a comma-separated values (CSV) _stream_ and return a Promise to a [table](https://idl.uw.edu/arquero/api/table). Delimiters other than commas, such as tabs or pipes (‘|’), can be specified using the _delimiter_ option. By default, automatic type inference is performed for input values; string values that match the [ISO standard date format](https://en.wikipedia.org/wiki/ISO_8601) are parsed into JavaScript Date objects. To disable this behavior set _autoType_ option to `false`, which will cause all columns to be loaded as strings. To perform custom parsing of input column values, use the _parse_ option.

This method performs parsing only. To specify a URL or file to load, use [loadCSV](https://idl.uw.edu/arquero/api/#loadCSV).

- _stream_: A [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) of text.
- _options_: A CSV format options object.
  - _delimiter_ (`string`): A single-character delimiter string between column values (default `','`).
  - _decimal_ (`string`): A single-character numeric decimal separator (default `'.'`).
  - _header_ (`boolean`): Boolean flag (default `true`) to specify the presence of a header row. If `true`, indicates the CSV contains a header row with column names. If `false`, indicates the CSV does not contain a header row and the columns are given the names `'col1'`, `'col2'`, etc unless the _names_ option is specified.
  - _names_ (`string[]`): An array of column names to use for header-less CSV files. This option is ignored if the _header_ option is `true`.
  - _skip_ (`number`): The number of lines to skip (default `0`) before reading data.
  - _comment_ (`string`): A string used to identify comment lines. Any lines that start with the comment pattern are skipped.
  - _autoType_ (`true`): Boolean flag (default `true`) for automatic type inference.
  - _autoMax_ (`number`): Maximum number of initial rows (default `1000`) to use for type inference.
  - _parse_ (`Record<string, function>`): Object of column parsing options. The object keys should be column names. The object values should be parsing functions to invoke to transform values upon input.

```js
// parse CSV from a compressed input stream
// (these stream transforms are performed internally by loadCSV)
const stream = (await fetch(url).then((res) => res.body))
  .pipeThrough(new DecompressionStream('gzip')) // decompress bytes
  .pipeThrough(new TextDecoderStream()); // map bytes to strings
await aq.fromCSVStream(stream);
```

---

[#](https://idl.uw.edu/arquero/api/#fromFixedStream) _aq_.**fromFixedStream** (_stream_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/from-fixed.js)

Parse a fixed-width file _stream_ and return a Promise to a [table](https://idl.uw.edu/arquero/api/table). By default, automatic type inference is performed for input values; string values that match the [ISO standard date format](https://en.wikipedia.org/wiki/ISO_8601) are parsed into JavaScript Date objects. To disable this behavior set _options.autoType_ to `false`, which will cause all columns to be loaded as strings. To perform custom parsing of input column values, use _options.parse_.

This method performs parsing only. To specify a URL or file to load, use [loadFixed](https://idl.uw.edu/arquero/api/#loadFixed).

- _stream_: A [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) of text.
- _options_: A fixed-width format options object.
  - _positions_ (`[number, number][]`): Array of \[start, end\] indices for fixed-width columns.
  - _widths_ (`number[]`): Array of fixed column widths. This option is ignored if the _positions_ property is specified.
  - _names_ (`string[]`): An array of column names. The array length should match the length of the _positions_ or _widths_ array. If not specified or shorter than the other array, default column names are generated.
  - _decimal_ (`string`): A single-character numeric decimal separator (default `'.'`).
  - _skip_ (`number`): The number of lines to skip (default `0`) before reading data.
  - _comment_ (`string`): A string used to identify comment lines. Any lines that start with the comment pattern are skipped.
  - _autoType_ (`boolean`): Boolean flag (default `true`) for automatic type inference.
  - _autoMax_ (`number`): Maximum number of initial rows (default `1000`) to use for type inference.
  - _parse_ (`Record<string, function>`): Object of column parsing options. The object keys should be column names. The object values should be parsing functions to invoke to transform values upon input.

```js
// parse fixed width text from a compressed input stream
// (these stream transforms are performed internally by loadFixed)
const stream = (await fetch(url).then((res) => res.body))
  .pipeThrough(new DecompressionStream('gzip')) // decompress bytes
  .pipeThrough(new TextDecoderStream()); // map bytes to strings
await aq.fromFixedStream(stream);
```

---

[#](https://idl.uw.edu/arquero/api/#parseJSONStream) _aq_.**parseJSONStream** (_stream_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/format/parse-json.js)

Parse a JavaScript Object Notation (JSON) _stream_ and return a Promise to a [table](https://idl.uw.edu/arquero/api/table). String values in JSON column arrays that match the [ISO standard date format](https://en.wikipedia.org/wiki/ISO_8601) are parsed into JavaScript Date objects. To disable this behavior, set the _autoType_ option to `false`. To perform custom parsing of input column values, use the _parse_ option. Auto-type Date parsing is not performed for columns with custom parse options.

This method performs parsing only. To specify a URL or file to load, use [loadJSON](https://idl.uw.edu/arquero/api/#loadJSON). Additionally, the [table](https://idl.uw.edu/arquero/api/#table) reads pre-parsed column-oriented JSON data into an Arquero table without type inference, while the [from](https://idl.uw.edu/arquero/api/#from) method similarly maps pre-parsed row-oriented JSON data into an Arquero table.

- _input_: A [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) of text.
- _options_: A JSON format options object:
  - _type_ (`'columns' | 'rows' | 'ndjson' | null`): The JSON format type. One of `'columns'` (for an object with named column arrays)`, 'rows'` (for an array for row objects), or `'ndjson'` for [newline-delimited JSON](https://github.com/ndjson/ndjson-spec) rows. For `'ndjson'`, each line of text must contain a JSON row object (with no trailing comma) and string properties must not contain any newline characters. If no format type is specified, one of `'rows'` or `'columns'` is inferred from the structure of the parsed JSON.
  - _columns_ (`string[]`): An array of column names to include. JSON properties missing from this list are not included in the table.
  - _skip_ (`number`): The number of lines to skip (default `0`) before reading data. Applicable to the `'ndjson'` type only.
  - _comment_ (`string`): A string used to identify comment lines. Any lines that start with the comment pattern are skipped. Applicable to the `ndjson` type only.
  - _autoType_ (`boolean`): Boolean flag (default `true`) for automatic type inference. If `false`, automatic date parsing for input JSON strings is disabled.
  - _parse_ (`Record<string, function>`): Object of column parsing options. The object keys should be column names. The object values should be parsing functions to invoke to transform values upon input.

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
// create table from an input text stream in NDJSON format
aq.fromJSONStream(textStream, { type: 'ndjson' });
```

## Expression Helpers

Methods for invoking or modifying table expressions.

---

[#](https://idl.uw.edu/arquero/api/#op) _aq_.**op** · [Source](https://github.com/uwdata/arquero/blob/master/src/op/op-api.js)

All table expression operations, including standard functions, aggregate functions, and window functions. See the [Operations API Reference](https://idl.uw.edu/arquero/api/op) for documentation of all available functions.

---

[#](https://idl.uw.edu/arquero/api/#agg) _aq_.**agg** (_table_, _expression_) · [Source](https://github.com/uwdata/arquero/blob/master/src/verbs/helpers/agg.js)

Compute a single aggregate value for a table. This method is a convenient shortcut for ungrouping a table, applying a [rollup](https://idl.uw.edu/arquero/api/verbs#rollup) verb for a single aggregate expression, and extracting the resulting aggregate value.

- _table_: An Arquero table.
- _expression_: An aggregate-valued table expression. Aggregate functions are permitted, and will take into account any [orderby](https://idl.uw.edu/arquero/api/#orderby) settings. Window functions are not permitted and any [groupby](https://idl.uw.edu/arquero/api/#groupby) settings will be ignored.

_Examples_

```js
aq.agg(aq.table({ a: [1, 2, 3] }), op.max('a')); // 3
```

```js
aq.agg(aq.table({ a: [1, 3, 5] }), (d) => [op.min(d.a), op.max('a')]); // [1, 5]
```

---

[#](https://idl.uw.edu/arquero/api/#escape) _aq_.**escape** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/helpers/escape.js)

Annotate a JavaScript function or _value_ to bypass Arquero’s default table expression handling. Escaped values enable the direct use of JavaScript functions to process row data: no internal parsing or code generation is performed, and so [closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures) and arbitrary function invocations are supported. Escaped values provide a lightweight alternative to [table params](https://idl.uw.edu/arquero/api/table#params) and [function registration](https://idl.uw.edu/arquero/api/extensibility#addFunction) to access variables in enclosing scopes.

An escaped value can be applied anywhere Arquero accepts [single-table table expressions](https://idl.uw.edu/arquero/api/expressions#table), including the [derive](https://idl.uw.edu/arquero/api/verbs#derive), [filter](https://idl.uw.edu/arquero/api/verbs#filter), and [spread](https://idl.uw.edu/arquero/api/verbs#spread) verbs. In addition, any of the [standard `op` functions](https://idl.uw.edu/arquero/api/op#functions) can be used within an escaped function. However, aggregate and window `op` functions are not supported. Also note that using escaped values will break [serialization of Arquero queries to worker threads](https://github.com/uwdata/arquero-worker).

- _value_: A literal value or a function that is passed a row object and params object as input. Aggregate and window `op` functions are not permitted.

_Examples_

```js
// filter based on a variable defined in the enclosing scope
const thresh = 5;
aq.table({ a: [1, 4, 9], b: [1, 2, 3] }).filter(aq.escape((d) => d.a < thresh));
// { a: [1, 4], b: [1, 2] }
```

```js
// apply a parsing function defined in the enclosing scope
const parseMDY = d3.timeParse('%m/%d/%Y');
aq.table({ date: ['1/1/2000', '06/01/2010', '12/10/2020'] }).derive({
  date: aq.escape((d) => parseMDY(d.date)),
});
// { date: [new Date(2000,0,1), new Date(2010,5,1), new Date(2020,11,10)] }
```

```js
// spread results from an escaped function that returns an array
const denom = 4;
aq.table({ a: [1, 4, 9] }).spread(
  { a: aq.escape((d) => [Math.floor(d.a / denom), d.a % denom]) },
  { as: ['div', 'mod'] }
);
// { div: [0, 1, 2], mod: [1, 0, 1] }
```

---

[#](https://idl.uw.edu/arquero/api/#bin) _aq_.**bin** (_name_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/helpers/bin.js)

Generate a table expression that performs uniform binning of number values. The resulting string can be used as part of the input to table transformation verbs.

- _name_: The name of the column to bin.
- _options_: A binning scheme options object:
  - _maxbins_: The maximum number of bins.
  - _minstep_: The minimum step size between bins.
  - _nice_: Boolean flag (default `true`) indicating if bins should snap to “nice” human-friendly values such as multiples of ten.
  - _offset_: Step offset for bin boundaries. The default (`0`) floors to the lower bin boundary. A value of `1` snaps one step higher to the upper bin boundary, and so on.
  - _step_: The exact step size to use between bins. If specified, the _maxbins_ and _minstep_ options are ignored.

_Examples_

```js
aq.bin('colA', { maxbins: 20 });
```

---

[#](https://idl.uw.edu/arquero/api/#collate) _aq_.**collate** (_expr_, _comparator_ \[, _options_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/helpers/collate.js)

Annotate a table expression with collation metadata, indicating how expression values should be compared and sorted. The [orderby](https://idl.uw.edu/arquero/api/verbs#orderby) verb uses collation metadata to determine sort order. The collate helper is particularly useful for locale-specific string comparisons. The collation information can either take the form a standard two-argument comparator function, or as locale and option arguments compatible with [`Intl.Collator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator).

- _expr_: The table expression to annotate with collation metadata.
- _comparator_: A comparator function or the locale(s) to use. For locales, both string (e.g., `'de'`, `'tr'`, etc.) and [`Intl.Locale`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale) objects (or an array with either) is supported.
- _options_: Collation options compatible with [`Intl.Collator`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator). This argument only applies if locales are provided as the second argument.

_Examples_

```js
// order colA using a German locale
aq.collate('colA', 'de');
```

```js
// order colA using a provided comparator function
aq.collate('colA', new Intl.Collator('de').compare);
```

---

[#](https://idl.uw.edu/arquero/api/#desc) _aq_.**desc** (_expr_) · [Source](https://github.com/uwdata/arquero/blob/master/src/helpers/desc.js)

Annotate a table expression (_expr_) to indicate descending sort order.

- _expr_: The table expression to annotate.

_Examples_

```js
// sort colA in descending order
aq.desc('colA');
```

```js
// sort colA in descending order of lower case values
aq.desc((d) => op.lower(d.colA));
```

---

[#](https://idl.uw.edu/arquero/api/#frac) _aq_.**frac** (_fraction_) · [Source](https://github.com/uwdata/arquero/blob/master/src/helpers/frac.js)

Generate a table expression that computes the number of rows corresponding to a given fraction for each group. The resulting string can be used as part of the input to the [sample](https://idl.uw.edu/arquero/api/verbs#sample) verb.

- _fraction_: The fractional value.

_Examples_

```js
aq.frac(0.5);
```

---

[#](https://idl.uw.edu/arquero/api/#rolling) _aq_.**rolling** (_expr_ \[, _frame_, _includePeers_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/helpers/rolling.js)

Annotate a table expression to compute rolling aggregate or window functions within a sliding window frame. For example, to specify a rolling 7-day average centered on the current day, call _rolling_ with a frame value of \[-3, 3\].

- _expr_: The table expression to annotate.
- _frame_:The sliding window frame offsets. Each entry indicates an offset from the current value. If an entry is non-finite, the frame will be unbounded in that direction, including all preceding or following values. If unspecified or `null`, the default frame `[-Infinity, 0]` includes the current values and all preceding values.
- _includePeers_: Boolean flag indicating if the sliding window frame should ignore peer (tied) values. If `false` (the default), the window frame boundaries are insensitive to peer values. If `true`, the window frame expands to include all peers. This parameter only affects operations that depend on the window frame: namely [aggregate functions](https://idl.uw.edu/arquero/api/op#aggregate-functions) and the [first_value](https://idl.uw.edu/arquero/api/op#first_value), [last_value](https://idl.uw.edu/arquero/api/op#last_value), and [nth_value](https://idl.uw.edu/arquero/api/op#last_values) window functions.

_Examples_

```js
// cumulative sum, with an implicit frame of [-Infinity, 0]
aq.rolling((d) => op.sum(d.colA));
```

```js
// centered 7-day moving average, assuming one value per day
aq.rolling((d) => op.mean(d.colA), [-3, 3]);
```

```js
// retrieve last value in window frame, including peers (ties)
aq.rolling((d) => op.last_value(d.colA), [-3, 3], true);
```

---

[#](https://idl.uw.edu/arquero/api/#seed) _aq_.**seed** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/util/random.js)

Set a seed value for random number generation. If the seed is a valid number, a 32-bit [linear congruential generator](https://en.wikipedia.org/wiki/Linear_congruential_generator) with the given seed will be used to generate random values. If the seed is `null`, `undefined`, or not a valid number, the random number generator will revert to `Math.random`.

- _seed_: The random seed value. Should either be an integer or a fraction between 0 and 1.

_Examples_

```js
// set random seed as an integer
aq.seed(12345);
```

```js
// set random seed as a fraction, maps to floor(fraction * (2 ** 32))
aq.seed(0.5);
```

```js
// revert to using Math.random
aq.seed(null);
```

## Selection Helpers

Methods for selecting columns. The result of these methods can be passed as arguments to [select](https://idl.uw.edu/arquero/api/verbs#select), [groupby](https://idl.uw.edu/arquero/api/verbs#groupby), [join](https://idl.uw.edu/arquero/api/verbs#join) and other transformation verbs.

---

[#](https://idl.uw.edu/arquero/api/#all) _aq_.**all** () · [Source](https://github.com/uwdata/arquero/blob/master/src/helpers/selection.js)

Select all columns in a table. Returns a function-valued selection compatible with [select](https://idl.uw.edu/arquero/api/verbs#select).

_Examples_

```js
aq.all();
```

---

[#](https://idl.uw.edu/arquero/api/#not) _aq_.**not** (_selection_) · [Source](https://github.com/uwdata/arquero/blob/master/src/helpers/selection.js)

Negate a column _selection_, selecting all other columns in a table. Returns a function-valued selection compatible with [select](https://idl.uw.edu/arquero/api/verbs#select).

- _selection_: The selection to negate. May be a column name, column index, array of either, or a selection function (e.g., from [range](https://idl.uw.edu/arquero/api/#range)).

_Examples_

```js
aq.not('colA', 'colB');
```

```js
aq.not(aq.range(2, 5));
```

---

[#](https://idl.uw.edu/arquero/api/#range) _aq_.**range** (_start_, _stop_) · [Source](https://github.com/uwdata/arquero/blob/master/src/helpers/selection.js)

Select a contiguous range of columns. Returns a function-valued selection compatible with [select](https://idl.uw.edu/arquero/api/verbs#select).

- _start_: The name or integer index of the first selected column.
- _stop_: The name or integer index of the last selected column.

_Examples_

```js
aq.range('colB', 'colE');
```

```js
aq.range(2, 5);
```

---

[#](https://idl.uw.edu/arquero/api/#matches) _aq_.**matches** (_pattern_) · [Source](https://github.com/uwdata/arquero/blob/master/src/helpers/selection.js)

Select all columns whose names match a pattern. Returns a function-valued selection compatible with [select](https://idl.uw.edu/arquero/api/verbs#select).

- _pattern_: A string or [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) pattern to match.

_Examples_

```js
// contains the string 'col'
aq.matches('col');
```

```js
// has 'a', 'b', or 'c' as the first character (case-insensitve)
aq.matches(/^[abc]/i);
```

---

[#](https://idl.uw.edu/arquero/api/#startswith) _aq_.**startswith** (_string_) · [Source](https://github.com/uwdata/arquero/blob/master/src/helpers/selection.js)

Select all columns whose names start with a string. Returns a function-valued selection compatible with [select](https://idl.uw.edu/arquero/api/verbs#select).

- _string_: The string to match at the start of the column name.

_Examples_

```js
aq.startswith('prefix_');
```

---

[#](https://idl.uw.edu/arquero/api/#endswith) _aq_.**endswith** (_string_) · [Source](https://github.com/uwdata/arquero/blob/master/src/helpers/selection.js)

Select all columns whose names end with a string. Returns a function-valued selection compatible with [select](https://idl.uw.edu/arquero/api/verbs#select).

- _string_: The string to match at the end of the column name.

_Examples_

```js
aq.endswith('_suffix');
```

---

[#](https://idl.uw.edu/arquero/api/#names) _aq_.**names** (_…names_) · [Source](https://github.com/uwdata/arquero/blob/master/src/helpers/names.js)

Select columns by index and rename them to the provided _names_. Returns a selection helper function that takes a table as input and produces a rename map as output. If the number of provided names is less than the number of table columns, the rename map will include entries for the provided names only. If the number of table columns is less than then number of provided names, the rename map will include only entries that cover the existing columns.

- _names_: An ordered set of strings to use as the new column names.

_Examples_

```js
// helper to rename the first three columns to 'a', 'b', 'c'
aq.names('a', 'b', 'c');
```

```js
// names can also be passed as arrays
aq.names(['a', 'b', 'c']);
```

```js
// rename the first three columns, all other columns remain as-is
table.rename(aq.names(['a', 'b', 'c']));
```

```js
// select and rename the first three columns, all other columns are dropped
table.select(aq.names(['a', 'b', 'c']));
```
