---
title: "Operations | Arquero API Reference"
source: "https://idl.uw.edu/arquero/api/op"
author:
  - "[[arquero]]"
published:
created: 2026-01-01
description: "Query processing and transformation of array-backed data tables."
tags:
  - "clippings"
---
## arquero

## Arquero API Reference

| [Top-Level](https://idl.uw.edu/arquero/api) | [Table](https://idl.uw.edu/arquero/api/table) | [Verbs](https://idl.uw.edu/arquero/api/verbs) | [**Op Functions**](https://idl.uw.edu/arquero/api/op) | [Expressions](https://idl.uw.edu/arquero/api/expressions) | [Extensibility](https://idl.uw.edu/arquero/api/extensibility) |
| --- | --- | --- | --- | --- | --- |

- [Standard Functions](https://idl.uw.edu/arquero/api/#functions)
	- [Array Functions](https://idl.uw.edu/arquero/api/#array-functions)
	- [Date Functions](https://idl.uw.edu/arquero/api/#date-functions)
	- [JSON Functions](https://idl.uw.edu/arquero/api/#json-functions)
	- [Math Functions](https://idl.uw.edu/arquero/api/#math-functions)
	- [Object Functions](https://idl.uw.edu/arquero/api/#object-functions)
	- [String Functions](https://idl.uw.edu/arquero/api/#string-functions)
- [Aggregate Functions](https://idl.uw.edu/arquero/api/#aggregate-functions)
	- [any](https://idl.uw.edu/arquero/api/#any), [bins](https://idl.uw.edu/arquero/api/#bins)
	- [count](https://idl.uw.edu/arquero/api/#count), [distinct](https://idl.uw.edu/arquero/api/#distinct), [valid](https://idl.uw.edu/arquero/api/#valid), [invalid](https://idl.uw.edu/arquero/api/#invalid)
	- [max](https://idl.uw.edu/arquero/api/#max), [min](https://idl.uw.edu/arquero/api/#min), [sum](https://idl.uw.edu/arquero/api/#sum), [product](https://idl.uw.edu/arquero/api/#product)
	- [mean](https://idl.uw.edu/arquero/api/#mean), [average](https://idl.uw.edu/arquero/api/#average), [mode](https://idl.uw.edu/arquero/api/#mode), [median](https://idl.uw.edu/arquero/api/#median), [quantile](https://idl.uw.edu/arquero/api/#quantile)
	- [stdev](https://idl.uw.edu/arquero/api/#stdev), [stdevp](https://idl.uw.edu/arquero/api/#stdevp), [variance](https://idl.uw.edu/arquero/api/#variance), [variancep](https://idl.uw.edu/arquero/api/#variance)
	- [corr](https://idl.uw.edu/arquero/api/#corr), [covariance](https://idl.uw.edu/arquero/api/#covariance), [covariancep](https://idl.uw.edu/arquero/api/#covariancep)
	- [array\_agg](https://idl.uw.edu/arquero/api/#array_agg), [array\_agg\_distinct](https://idl.uw.edu/arquero/api/#array_agg_distinct), [object\_agg](https://idl.uw.edu/arquero/api/#object_agg), [map\_agg](https://idl.uw.edu/arquero/api/#map_agg), [entries\_agg](https://idl.uw.edu/arquero/api/#entries_agg)
- [Window Functions](https://idl.uw.edu/arquero/api/#window-functions)
	- [row\_number](https://idl.uw.edu/arquero/api/#row_number), [rank](https://idl.uw.edu/arquero/api/#rank), [avg\_rank](https://idl.uw.edu/arquero/api/#avg_rank), [dense\_rank](https://idl.uw.edu/arquero/api/#dense_rank)
	- [percent\_rank](https://idl.uw.edu/arquero/api/#percent_rank), [cume\_dist](https://idl.uw.edu/arquero/api/#cume_dist), [ntile](https://idl.uw.edu/arquero/api/#ntile)
	- [lag](https://idl.uw.edu/arquero/api/#lag), [lead](https://idl.uw.edu/arquero/api/#lead), [first\_value](https://idl.uw.edu/arquero/api/#first_value), [last\_value](https://idl.uw.edu/arquero/api/#last_value), [nth\_value](https://idl.uw.edu/arquero/api/#nth_value)
	- [fill\_down](https://idl.uw.edu/arquero/api/#fill_down), [fill\_up](https://idl.uw.edu/arquero/api/#fill_up)

  

## Standard Functions

Standard library of table expression functions. The [`op` object](https://idl.uw.edu/arquero/api/#op) exports these as standard JavaScript functions that behave the same whether invoked inside or outside a table expression context.

### Array Functions

---

[#](https://idl.uw.edu/arquero/api/#compact) *op*.**compact** (*array*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Returns a new compacted array with invalid values (`null`, `undefined`, `NaN`) removed.

- *array*: The array to compact.

*Examples*

```js
op.compact([1, null, 2, undefined, NaN, 3]) // [ 1, 2, 3 ]
```

---

[#](https://idl.uw.edu/arquero/api/#concat) *op*.**concat** (*…values*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Merges two or more arrays in sequence, returning a new array.

- *values*: The arrays to merge.

---

[#](https://idl.uw.edu/arquero/api/#includes) *op*.**includes** (*array*, *value* \[, *index*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Determines whether an *array* includes a certain *value* among its entries, returning `true` or `false` as appropriate.

- *array*: The input array value.
- *value*: The value to search for.
- *index*: The integer index to start searching from (default `0`).

---

[#](https://idl.uw.edu/arquero/api/#indexof) *op*.**indexof** (*sequence*, *value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Returns the first index at which a given *value* can be found in the *sequence* (array or string), or -1 if it is not present.

- *sequence*: The input array or string value.
- *value*: The value to search for.

---

[#](https://idl.uw.edu/arquero/api/#join) *op*.**join** (*array* \[, *delimiter*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Creates and returns a new string by concatenating all of the elements in an *array* (or an array-like object), separated by commas or a specified *delimiter* string. If the *array* has only one item, then that item will be returned without using the delimiter.

- *array*: The input array value.
- *delimiter*: The delimiter string (default `','`).

---

[#](https://idl.uw.edu/arquero/api/#lastindexof) *op*.**lastindexof** (*sequence*, *value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Returns the last index at which a given *value* can be found in the *sequence* (array or string), or -1 if it is not present.

- *sequence*: The input array or string value.
- *value*: The value to search for.

---

[#](https://idl.uw.edu/arquero/api/#length) *op*.**length** (*sequence*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Returns the length of the input *sequence* (array or string).

- *sequence*: The input array or string value.

---

[#](https://idl.uw.edu/arquero/api/#pluck) *op*.**pluck** (*array*, *property*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Returns a new array in which the given *property* has been extracted for each element in the input *array*.

- *array*: The input array value.
- *property*: The property name string to extract. Nested properties are not supported: the input `"a.b"` will indicates a property with that exact name, *not* a nested property `"b"` of the object `"a"`.

---

[#](https://idl.uw.edu/arquero/api/#reverse) *op*.**reverse** (*sequence*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Returns a new array or string with the element order reversed: the first *sequence* element becomes the last, and the last *sequence* element becomes the first. The input *sequence* is unchanged.

- *sequence*: The input array or string value.

---

[#](https://idl.uw.edu/arquero/api/#sequence) *op*.**sequence** (\[*start*,\] *stop* \[, *step*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/sequence.js)

Returns an array containing an arithmetic sequence from the *start* value to the *stop* value, in *step* increments. If *step* is positive, the last element is the largest *start + i \* step* less than *stop*; if *step* is negative, the last element is the smallest *start + i \* step* greater than *stop*. If the returned array would contain an infinite number of values, an empty range is returned.

- *start*: The starting value of the sequence (default `0`).
- *stop*: The stopping value of the sequence. The stop value is exclusive; it is not included in the result.
- *step*: The step increment between sequence values (default `1`).

---

[#](https://idl.uw.edu/arquero/api/#slice) *op*.**slice** (*sequence* \[, *start*, *end*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Returns a copy of a portion of the input *sequence* (array or string) selected from *start* to *end* (*end* not included) where *start* and *end* represent the index of items in the sequence.

- *sequence*: The input array or string value.
- *start*: The starting integer index to copy from (inclusive, default `0`).
- *end*: The ending integer index to copy from (exclusive, default `sequence.length`).

  

### Date Functions

---

[#](https://idl.uw.edu/arquero/api/#now) *op*.**now** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the current time as the number of milliseconds elapsed since January 1, 1970 00:00:00 UTC.

---

*op*.**timestamp** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the timestamp for a *date* as the number of milliseconds elapsed since January 1, 1970 00:00:00 UTC.

- *date*: The input Date value.

---

[#](https://idl.uw.edu/arquero/api/#datetime) *op*.**datetime** (\[*year*, *month*, *date*, *hours*, *minutes*, *seconds*, *milliseconds*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Creates and returns a new Date value. If no arguments are provided, the current date and time are used.

- *year*: The year.
- *month* The (zero-based) month (default `0`).
- *date* The date within the month (default `1`).
- hours: The hour within the day (default `0`).
- *minutes*: The minute within the hour (default `0`).
- *seconds*: The second within the minute (default `0`).
- *milliseconds*: The milliseconds within the second (default `0`).

---

[#](https://idl.uw.edu/arquero/api/#year) *op*.**year** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the year of the specified *date* according to local time.

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#quarter) *op*.**quarter** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the zero-based quarter of the specified *date* according to local time.

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#month) *op*.**month** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the zero-based month of the specified *date* according to local time. A value of `0` indicates January, `1` indicates February, and so on.

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#week) *op*.**week** (*date* \[, *firstday*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the week number of the year (0-53) for the specified *date* according to local time. By default, Sunday is used as the first day of the week. All days in a new year preceding the first Sunday are considered to be in week 0.

- *date*: The input Date or timestamp value.
- *firstday*: Number of first day of the week (default `0` for Sunday, `1` for Monday and so on).

---

*op*.**date** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the date (day of month) of the specified *date* according to local time.

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#dayofyear) *op*.**dayofyear** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the day of the year (1-366) of the specified *date* according to local time.

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#dayofweek) *op*.**dayofweek** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the Sunday-based day of the week (0-6) of the specified *date* according to local time. A value of `0` indicates Sunday, `1` indicates Monday, and so on.

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#hours) *op*.**hours** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the hour of the day for the specified *date* according to local time.

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#minutes) *op*.**minutes** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the minute of the hour for the specified *date* according to local time.

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#seconds) *op*.**seconds** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the seconds of the minute for the specified *date* according to local time.

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#milliseconds) *op*.**milliseconds** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the milliseconds of the second for the specified *date* according to local time.

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcdatetime) *op*.**utcdatetime** (\[*year*, *month*, *date*, *hours*, *minutes*, *seconds*, *milliseconds*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Creates and returns a new Date value using [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time). If no arguments are provided, the current date and time are used.

- *year*: The year.
- *month* The (zero-based) month (default `0`).
- *date* The date within the month (default `1`).
- hours: The hour within the day (default `0`).
- *minutes*: The minute within the hour (default `0`).
- *seconds*: The second within the minute (default `0`).
- *milliseconds*: The milliseconds within the second (default `0`).

---

[#](https://idl.uw.edu/arquero/api/#utcyear) *op*.**utcyear** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the year of the specified *date* according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcquarter) *op*.**utcquarter** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the zero-based quarter of the specified *date* according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcmonth) *op*.**utcmonth** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the zero-based month of the specified *date* according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time). A value of `0` indicates January, `1` indicates February, and so on.

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcweek) *op*.**utcweek** (*date* \[, *firstday*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the week number of the year (0-53) for the specified *date* according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time). By default, Sunday is used as the first day of the week. All days in a new year preceding the first Sunday are considered to be in week 0.

- *date*: The input Date or timestamp value.
- *firstday*: Number of first day of the week (default `0` for Sunday, `1` for Monday and so on).

---

[#](https://idl.uw.edu/arquero/api/#utcdate) *op*.**utcdate** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the date (day of month) of the specified *date* according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcdayofyear) *op*.**utcdayofyear** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the day of the year (1-366) of the specified *date* according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcdayofweek) *op*.**utcdayofweek** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the Sunday-based day of the week (0-6) of the specified *date* according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time). A value of `0` indicates Sunday, `1` indicates Monday, and so on.

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utchours) *op*.**utchours** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the hour of the day for the specified *date* according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcminutes) *op*.**utcminutes** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the minute of the hour for the specified *date* according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcseconds) *op*.**utcseconds** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the seconds of the minute for the specified *date* according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcmilliseconds) *op*.**utcmilliseconds** (*date*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the milliseconds of the second for the specified *date* according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- *date*: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#format_date) *op*.**format\_date** (*date* \[, *shorten*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns an [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) formatted string for the given *date* in local timezone. The resulting string is compatible with [parse\_date](https://idl.uw.edu/arquero/api/#parse_date) and JavaScript’s built-in [Date.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse).

- *date*: The input Date or timestamp value.
- *shorten*: A boolean flag (default `false`) indicating if the formatted string should be shortened if possible. For example, the local date `2001-01-01` will shorten from `"2001-01-01T00:00:00.000"` to `"2001-01-01T00:00"`.

---

[#](https://idl.uw.edu/arquero/api/#format_utcdate) *op*.**format\_utcdate** (*date* \[, *shorten*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns an [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) formatted string for the given *date* in [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time). The resulting string is compatible with [parse\_date](https://idl.uw.edu/arquero/api/#parse_date) and JavaScript’s built-in [Date.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse).

- *date*: The input Date or timestamp value.
- *shorten*: A boolean flag (default `false`) indicating if the formatted string should be shortened if possible. For example, the UTC date `2001-01-01` will shorten from `"2001-01-01T00:00:00.000Z"` to `"2001-01-01"`.

  

### JSON Functions

Functions for parsing and generating strings formatted using [JavaScript Object Notation (JSON)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON).

---

[#](https://idl.uw.edu/arquero/api/#parse_json) *op*.**parse\_json** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/json.js)

Parses a string *value* in [JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON) format, constructing the JavaScript value or object described by the string.

- *value*: The input string value.

---

[#](https://idl.uw.edu/arquero/api/#to_json) *op*.**to\_json** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/json.js)

Converts a JavaScript object or value to a [JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON) string.

- *value*: The value to convert to a JSON string.

  

### Math Functions

---

[#](https://idl.uw.edu/arquero/api/#bin) *op*.**bin** (*value*, *min*, *max*, *step* \[, *offset*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/bin.js)

Truncate a *value* to a bin boundary. Useful for creating equal-width histograms. Values outside the `[min, max]` range will be mapped to `-Infinity` (*value < min*) or `+Infinity` (*value > max*).

- *value*: The number value to bin.
- *min*: The minimum bin boundary value.
- *max*: The maximum bin boundary value.
- *step*: The step size between bin boundaries.
- *offset*: Offset in steps (default `0`) by which to adjust the returned bin value. An offset of `1` returns the next boundary.

---

[#](https://idl.uw.edu/arquero/api/#random) *op*.**random** () · [Source](https://github.com/uwdata/arquero/blob/master/src/util/random.js)

Return a random floating point number between 0 (inclusive) and 1 (exclusive). By default uses [Math.random](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random). Use the [seed](https://idl.uw.edu/arquero/api/#seed) method to instead use a seeded random number generator.

---

[#](https://idl.uw.edu/arquero/api/#is_nan) *op*.**is\_nan** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Tests if the input *value* is not a number (`NaN`); equivalent to [Number.isNaN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN). The method will return `true` only if the input *value* is an actual numeric `NaN` value; it will return `false` for other types (booleans, strings, *etc*.).

- *value*: The value to test.

*Examples*

```js
op.is_nan(NaN) // true
op.is_nan(0/0) // true
op.is_nan(op.sqrt(-1)) // true
```
```js
op.is_nan('foo') // false
op.is_nan(+'foo') // true, coerce to number first
```
```js
op.is_nan(true) // false
op.is_nan(+true) // false, booleans coerce to numbers
```
```js
op.is_nan(undefined) // false
op.is_nan(+undefined) // true, coerce to number first
```
```js
op.is_nan(null) // false
op.is_nan(+null) // false, null coerces to zero
```

---

[#](https://idl.uw.edu/arquero/api/#is_finite) *op*.**is\_finite** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Tests if the input *value* is finite; equivalent to [Number.isFinite](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite).

- *value*: The value to test.

---

[#](https://idl.uw.edu/arquero/api/#abs) *op*.**abs** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the absolute value of the input *value*; equivalent to [Math.abs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/abs).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#cbrt) *op*.**cbrt** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the cube root value of the input *value*; equivalent to [Math.cbrt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/cbrt).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#ceil) *op*.**ceil** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the ceiling of the input *value*, the nearest integer equal to or greater than the input; equivalent to [Math.ceil](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/ceil).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#clz32) *op*.**clz32** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the number of leading zero bits in the 32-bit binary representation of a number *value*; equivalent to [Math.clz32](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#exp) *op*.**exp** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns *e <sup>value</sup>*, where *e* is Euler’s number, the base of the natural logarithm; equivalent to [Math.exp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/exp).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#expm1) *op*.**expm1** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns *e <sup>value</sup> - 1*, where *e* is Euler’s number, the base of the natural logarithm; equivalent to [Math.expm1](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/expm1).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#floor) *op*.**floor** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the floor of the input *value*, the nearest integer equal to or less than the input; equivalent to [Math.floor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/floor).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#fround) *op*.**fround** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the nearest 32-bit single precision float representation of the input number *value*; equivalent to [Math.fround](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround). Useful for translating between 64-bit `Number` values and values from a `Float32Array`.

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#greatest) *op*.**greatest** (*…values*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the greatest (maximum) value among the input *values*; equivalent to [Math.max](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max). This is *not* an aggregate function, see [op.max](https://idl.uw.edu/arquero/api/#max) to compute a maximum value across multiple rows.

- *values*: Zero or more input values.

---

[#](https://idl.uw.edu/arquero/api/#least) *op*.**least** (*…values*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the least (minimum) value among the input *values*; equivalent to [Math.min](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/min). This is *not* an aggregate function, see [op.min](https://idl.uw.edu/arquero/api/#min) to compute a minimum value across multiple rows.

- *values*: Zero or more input values.

---

[#](https://idl.uw.edu/arquero/api/#log) *op*.**log** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the natural logarithm (base *e*) of a number *value*; equivalent to [Math.log](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#log10) *op*.**log10** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the base 10 logarithm of a number *value*; equivalent to [Math.log10](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log10).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#log1p) *op*.**log1p** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the natural logarithm (base *e*) of 1 + a number *value*; equivalent to [Math.log1p](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log1p).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#log2) *op*.**log2** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the base 2 logarithm of a number *value*; equivalent to [Math.log2](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log2).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#pow) *op*.**pow** (*base*, *exponent*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the *base* raised to the *exponent* power, that is, *base* <sup><em>exponent</em></sup>; equivalent to [Math.pow](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/pow).

- *base*: The base number value.
- *exponent*: The exponent number value.

---

[#](https://idl.uw.edu/arquero/api/#round) *op*.**round** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the value of a number rounded to the nearest integer;; equivalent to [Math.round](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#sign) *op*.**sign** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns either a positive or negative +/- 1, indicating the sign of the input *value*; equivalent to [Math.sign](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sign).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#sqrt) *op*.**sqrt** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the square root of the input *value*; equivalent to [Math.sqrt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sqrt).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#trunc) *op*.**trunc** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the integer part of a number by removing any fractional digits; equivalent to [Math.trunc](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#degrees) *op*.**degrees** (*radians*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Converts the input *radians* value to degrees.

- *value*: The input number value in radians.

---

[#](https://idl.uw.edu/arquero/api/#radians) *op*.**radians** (*radians*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Converts the input *degrees* value to radians.

- *value*: The input number value in degrees.

---

[#](https://idl.uw.edu/arquero/api/#acos) *op*.**acos** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the arc-cosine (in radians) of a number *value*; equivalent to [Math.acos](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/acos).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#acosh) *op*.**acosh** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the hyperbolic arc-cosine of a number *value*; equivalent to [Math.acosh](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/acosh).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#asin) *op*.**asin** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the arc-sine (in radians) of a number *value*; equivalent to [Math.asin](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/asin).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#asinh) *op*.**asinh** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the hyperbolic arc-sine of a number *value*; equivalent to [Math.asinh](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/asinh).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#atan) *op*.**atan** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the arc-tangent (in radians) of a number *value*; equivalent to [Math.atan](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/atan).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#atan2) *op*.**atan2** (*y*, *x*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the angle in the plane (in radians) between the positive x-axis and the ray from (0, 0) to the point (*x*, *y*);; equivalent to [Math.atan2](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/atan2).

- *y*: The y coordinate of the point.
- *x*: The x coordinate of the point.

---

[#](https://idl.uw.edu/arquero/api/#atanh) *op*.**atanh** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the hyperbolic arc-tangent of a number *value*; equivalent to [Math.atanh](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/atanh).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#cos) *op*.**cos** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the cosine (in radians) of a number *value*; equivalent to [Math.cos](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/cos).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#cosh) *op*.**cosh** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the hyperbolic cosine of a number *value*; equivalent to [Math.cosh](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/cosh).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#sin) *op*.**sin** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the sine (in radians) of a number *value*; equivalent to [Math.sin](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sin).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#sinh) *op*.**sinh** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the hyperbolic sine of a number *value*; equivalent to [Math.sinh](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sinh).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#tan) *op*.**tan** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the tangent (in radians) of a number *value*; equivalent to [Math.tan](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/tan).

- *value*: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#tanh) *op*.**tanh** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the hyperbolic tangent of a number *value*; equivalent to [Math.tanh](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/tanh).

- *value*: The input number value.

  

### Object Functions

---

[#](https://idl.uw.edu/arquero/api/#equal) *op*.**equal** (*a*, *b*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/equal.js)

Compare two values for equality, using join semantics in which `null !== null`. If the inputs are object-valued, a deep equality check of array entries or object key-value pairs is performed. The method is helpful within custom [join](https://idl.uw.edu/arquero/api/verbs/#join) condition expressions.

- *a*: The first input to compare.
- *b*: The second input to compare.

---

[#](https://idl.uw.edu/arquero/api/#has) *op*.**has** (*object*, *key*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/object.js)

Returns a boolean indicating whether the *object* has the specified *key* as its own property (as opposed to inheriting it). If the *object* is a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) or [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) instance, the `has` method will be invoked directly on the object, otherwise `Object.hasOwnProperty` is used.

- *object*: The object, Map, or Set to test for property membership.
- *key*: The string key (property name) to test for.

---

[#](https://idl.uw.edu/arquero/api/#keys) *op*.**keys** (*object*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/object.js)

Returns an array of a given *object* ’s own enumerable property names. If the *object* is a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) instance, the `keys` method will be invoked directly on the object, otherwise `Object.keys` is used.

- *object*: The input object or Map value.

---

[#](https://idl.uw.edu/arquero/api/#values) *op*.**values** (*object*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/object.js)

Returns an array of a given *object* ’s own enumerable property values. If the *object* is a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) or [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) instance, the `values` method will be invoked directly on the object, otherwise `Object.values` is used.

- *object*: The input object, Map, or Set value.

---

[#](https://idl.uw.edu/arquero/api/#entries) *op*.**entries** (*object*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/object.js)

Returns an array of a given *object* ’s own enumerable string-keyed property `[key, value]` pairs. If the *object* is a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) or [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) instance, the `entries` method will be invoked directly on the object, otherwise `Object.entries` is used.

- *object*: The input object, Map, or Set value.

---

[#](https://idl.uw.edu/arquero/api/#object) *op*.**object** (*entries*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/object.js)

Returns a new object given an iterable *entries* argument of `[key, value]` pairs. This method is Arquero’s version of the standard [Object.fromEntries](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/fromEntries) method.

- *entries*: An iterable collection of `[key, value]` pairs, such as an array of two-element arrays or a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map).

---

[#](https://idl.uw.edu/arquero/api/#recode) *op*.**recode** (*value*, *map* \[, *fallback*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/recode.js)

Recodes an input *value* to an alternative value, based on a provided value *map* object. If a *fallback* value is specified, it will be returned when the input value is not found in the map; otherwise, the input value is returned unchanged.

- *value*: The value to recode. The value must be safely coercible to a string for lookup against the value map.
- *map*: An object or [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) with input values for keys and recoded values for values. If a non-Map object, only the object’s own properties will be considered; inherited properties on the prototype chain are ignored.
- *fallback*: An optional fallback value to use if the input value is not found in the value map. If a fallback is not specified, the input value will be returned unchanged when not found in the map.

*Examples*

```js
// recode values in a derive statement
table.derive({ val: d => op.recode(d.val, { 'opt:a': 'A', 'opt:b': 'B' }) })
```
```js
// define value map externally, bind as parameter
const map = { 'opt:a': 'A', 'opt:b': 'B' };
table
  .params({ map })
  .derive({ val: (d, $) => op.recode(d.val, $.map, '?') })
```
```js
// using a Map object, bind as parameter
const map = new Map().set('opt:a', 'A').set('opt:b', 'B');
table
  .params({ map })
  .derive({ val: (d, $) => op.recode(d.val, $.map, '?') })
```

---

[#](https://idl.uw.edu/arquero/api/#row_object) *op*.**row\_object** (\[*…columns*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/op-api.js)

Generate a new object containing the data for the current table row. The new object maps from column name keys to table values for the current row. The optional *columns* list indicates which columns to include in the object; if unspecified, all columns are included by default.

This method can only be invoked within a single-table expression. Calling this method in a multi-table expression (such as for a join) results in an error. An error will also result if any provided column names are specified using dynamic lookups of table column values.

- *columns*: A list of column names or indices to include in the object.

*Examples*

```js
aq.table({ a: [1, 3], b: [2, 4] })
  .derive({ row: op.row_object() })
  .get('row', 0); // { a: 1, b: 2 }
```
```js
// rollup a table into an array of row objects
table.rollup({ rows: d => op.array_agg(op.row_object()) })
```

  

### String Functions

---

[#](https://idl.uw.edu/arquero/api/#parse_date) *op*.**parse\_date** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Parses a string *value* and returns a Date instance. Beware: this method uses JavaScript’s [`Date.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse) functionality, which is inconsistently implemented across browsers. That said, [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) formatted strings such as those produced by [format\_date](https://idl.uw.edu/arquero/api/#format_date) and [format\_utcdate](https://idl.uw.edu/arquero/api/#format_utcdate) should be supported across platforms. Note that “bare” ISO date strings such as `"2001-01-01"` are interpreted by JavaScript as indicating midnight of that day in [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time), *not* local time. To indicate the local timezone, an ISO string can include additional time components and no `Z` suffix: `"2001-01-01T00:00"`.

- *value*: The input value.

---

[#](https://idl.uw.edu/arquero/api/#parse_float) *op*.**parse\_float** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Parses a string *value* and returns a floating point number.

- *value*: The input value.

---

[#](https://idl.uw.edu/arquero/api/#parse_int) *op*.**parse\_int** (*value* \[, *radix*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Parses a string *value* and returns an integer of the specified radix (the base in mathematical numeral systems).

- *value*: The input value.
- *radix*: An integer between 2 and 36 that represents the radix (the base in mathematical numeral systems) of the string. Be careful: this does not default to 10! If *radix* is `undefined`, `0`, or unspecified, JavaScript assumes the following: If the input string begins with `"0x"` or `"0X"` (a zero, followed by lowercase or uppercase X), the radix is assumed to be 16 and the rest of the string is parsed as a hexidecimal number. If the input string begins with `"0"` (a zero), the radix is assumed to be 8 (octal) or 10 (decimal). Exactly which radix is chosen is implementation-dependent. If the input string begins with any other value, the radix is 10 (decimal).

---

[#](https://idl.uw.edu/arquero/api/#endswith) *op*.**endswith** (*value*, *search* \[, *length*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Determines whether a string *value* ends with the characters of a specified *search* string, returning `true` or `false` as appropriate.

- *value*: The input string value.
- *search*: The search string to test for.
- *length*: If provided, used as the length of *value* (default `value.length`).

---

[#](https://idl.uw.edu/arquero/api/#match) *op*.**match** (*value*, *regexp* \[, *index*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Retrieves the result of matching a string *value* against a regular expression *regexp*. If no *index* is specified, returns an array whose contents depend on the presence or absence of the regular expression global (`g`) flag, or `null` if no matches are found. If the `g` flag is used, all results matching the complete regular expression will be returned, but capturing groups will not. If the `g` flag is not used, only the first complete match and its related capturing groups are returned.

If specified, the *index* looks up a value of the resulting match. If *index* is a number, the corresponding index of the result array is returned. If *index* is a string, the value of the corresponding [named capture group](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Groups_and_Ranges) is returned, or `null` if there is no such group.

- *value*: The input string value.
- *regexp*: The [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) to match against.
- *index*: The index into the match result array or capture group.

*Examples*

```js
// returns ['1', '2', '3']
op.match('1 2 3', /\d+/g)
```
```js
// returns '2' (index into match array)
op.match('1 2 3', /\d+/g, 1)
```
```js
// returns '3' (index of capture group)
op.match('1 2 3', /\d+ \d+ (\d+)/, 1)
```
```js
// returns '2' (named capture group)
op.match('1 2 3', /\d+ (?<digit>\d+)/, 'digit')
```

---

[#](https://idl.uw.edu/arquero/api/#normalize) *op*.**normalize** (*value* \[, *form*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Returns the Unicode normalization form of the string *value*.

- *value*: The input string to normalize.
- *form*: The Unicode normalization form, one of `'NFC'` (default, canonical decomposition, followed by canonical composition), `'NFD'` (canonical decomposition), `'NFKC'` (compatibility decomposition, followed by canonical composition), or `'NFKD'` (compatibility decomposition).

---

[#](https://idl.uw.edu/arquero/api/#padend) *op*.**padend** (*value*, *length* \[, *fill*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Pad a string *value* with a given *fill* string (applied from the end of *value* and repeated, if needed) so that the resulting string reaches a given *length*.

- *value*: The input string to pad.
- *length*: The length of the resulting string once the *value* string has been padded. If the length is lower than `value.length`, the *value* string will be returned as-is.
- *fill*: The string to pad the *value* string with (default `''`). If *fill* is too long to stay within the target *length*, it will be truncated: for left-to-right languages the left-most part and for right-to-left languages the right-most will be applied.

---

[#](https://idl.uw.edu/arquero/api/#padstart) *op*.**padstart** (*value*, *length* \[, *fill*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Pad a string *value* with a given *fill* string (applied from the start of *value* and repeated, if needed) so that the resulting string reaches a given *length*.

- *value*: The input string to pad.
- *length*: The length of the resulting string once the *value* string has been padded. If the length is lower than `value.length`, the *value* string will be returned as-is.
- *fill*: The string to pad the *value* string with (default `''`). If *fill* is too long to stay within the target *length*, it will be truncated: for left-to-right languages the left-most part and for right-to-left languages the right-most will be applied.

---

[#](https://idl.uw.edu/arquero/api/#lower) *op*.**lower** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Returns the string *value* converted to lower case.

- *value*: The input string value.

---

[#](https://idl.uw.edu/arquero/api/#upper) *op*.**upper** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Returns the string *value* converted to upper case.

- *value*: The input string value.

---

[#](https://idl.uw.edu/arquero/api/#repeat) *op*.**repeat** (*value*, *number*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Returns a new string which contains the specified *number* of copies of the *value* string concatenated together.

- *value*: The input string to repeat.
- *number*: An integer between `0` and `+Infinity`, indicating the number of times to repeat the string.

---

[#](https://idl.uw.edu/arquero/api/#replace) *op*.**replace** (*value*, *pattern*, *replacement*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Returns a new string with some or all matches of a *pattern* replaced by a *replacement*. The *pattern* can be a string or a regular expression, and the *replacement* must be a string. If *pattern* is a string, only the first occurrence will be replaced; to make multiple replacements, use a regular expression *pattern* with a `g` (global) flag.

- *value*: The input string value.
- *pattern*: The pattern string or regular expression to replace.
- *replacement*: The replacement string to use.

---

[#](https://idl.uw.edu/arquero/api/#split) *op*.**split** (*value*, *separator* \[, *limit*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Divides a string *value* into an ordered list of substrings based on a *separator* pattern, puts these substrings into an array, and returns the array.

- *value*: The input string value.
- *separator*: A string or regular expression pattern describing where each split should occur.
- *limit*: An integer specifying a limit on the number of substrings to be included in the array.

---

[#](https://idl.uw.edu/arquero/api/#startswith) *op*.**startswith** (*value*, *search* \[, *position*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Determines whether a string *value* starts with the characters of a specified *search* string, returning `true` or `false` as appropriate.

- *value*: The input string value.
- *search*: The search string to test for.
- *position*: The position in the *value* string at which to begin searching (default `0`).

---

[#](https://idl.uw.edu/arquero/api/#substring) *op*.**substring** (*value* \[, *start*, *end*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Returns the part of the string *value* between the *start* and *end* indexes, or to the end of the string.

- *value*: The input string value.
- *start*: The index of the first character to include in the returned substring (default `0`).
- *end*: The index of the first character to exclude from the returned substring (default `value.length`).

---

[#](https://idl.uw.edu/arquero/api/#trim) *op*.**trim** (*value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Returns a new string with whitespace removed from both ends of the input *value* string. Whitespace in this context is all the whitespace characters (space, tab, no-break space, etc.) and all the line terminator characters (LF, CR, etc.).

- *value*: The input string value to trim.

  

## Aggregate Functions

Aggregate table expression functions for summarizing values. If invoked outside a table expression context, column (field) inputs must be column name strings, and the operator will return a corresponding table expression.

---

[#](https://idl.uw.edu/arquero/api/#any) *op*.**any** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function returning an arbitrary observed value (typically the first encountered).

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#bins) *op*.**bins** (*field* \[, *maxbins*, *nice*, *minstep*, *step*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for calculating a binning scheme in terms of the minimum bin boundary, maximum bin boundary, and step size.

- *field*: The data column or derived field.
- *maxbins*: The maximum number of allowed bins (default `15`).
- *nice*: Boolean flag (default `true`) indicating if the bin min and max should snap to “nice” human-friendly values such as multiples of 10.
- *minstep*: The minimum allowed step size between bins.
- *step*: The exact step size to use between bins. If specified, the *maxbins* and *minstep* arguments are ignored.

---

[#](https://idl.uw.edu/arquero/api/#count) *op*.**count** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to count the number of records (rows).

---

[#](https://idl.uw.edu/arquero/api/#distinct) *op*.**distinct** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to count the number of distinct values.

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#valid) *op*.**valid** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to count the number of valid values. Invalid values are `null`, `undefined`, or `NaN`.

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#invalid) *op*.**invalid** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to count the number of invalid values. Invalid values are `null`, `undefined`, or `NaN`.

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#max) *op*.**max** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the maximum value. For a non-aggregate version, see [op.greatest](https://idl.uw.edu/arquero/api/#greatest).

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#min) *op*.**min** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the minimum value. For a non-aggregate version, see [op.least](https://idl.uw.edu/arquero/api/#least).

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#sum) *op*.**sum** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to sum values.

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#product) *op*.**product** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to multiply values.

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#mean) *op*.**mean** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the mean (average) value. This operator is a synonym for [average](https://idl.uw.edu/arquero/api/#average).

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#average) *op*.**average** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the average (mean) value. This operator is a synonym for [mean](https://idl.uw.edu/arquero/api/#mean).

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#mode) *op*.**mode** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to determine the mode (most frequent) value.

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#median) *op*.**median** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the median value. This operation is a shorthand for the [quantile](https://idl.uw.edu/arquero/api/#quantile) value at p = 0.5.

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#quantile) *op*.**quantile** (*field*, *p*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to compute the quantile boundary of a data field for a probability threshold. The [median](https://idl.uw.edu/arquero/api/#median) is the value of quantile at p = 0.5.

- *field*: The data column or derived field.
- *p*: The probability threshold.

---

[#](https://idl.uw.edu/arquero/api/#stdev) *op*.**stdev** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the sample standard deviation.

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#stdevp) *op*.**stdevp** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the population standard deviation.

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#variance) *op*.**variance** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the sample variance.

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#variancep) *op*.**variancep** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the population variance.

---

[#](https://idl.uw.edu/arquero/api/#corr) *op*.**corr** (*field1*, *field2*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the [product-moment correlation](https://en.wikipedia.org/wiki/Pearson_correlation_coefficient) between two variables. To instead compute a [rank correlation](https://en.wikipedia.org/wiki/Spearman%27s_rank_correlation_coefficient), compute the average ranks for each variable and then apply this function to the result.

- *field1*: The first data column or derived field.
- *field2*: The second data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#covariance) *op*.**covariance** (*field1*, *field2*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the sample covariance between two variables.

- *field1*: The first data column or derived field.
- *field2*: The second data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#covariancep) *op*.**covariancep** (*field1*, *field2*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the population covariance between two variables.

- *field1*: The first data column or derived field.
- *field2*: The second data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#array_agg) *op*.**array\_agg** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to collect an array of *field* values. The resulting aggregate is an array (one per group) containing all observed values. The order of values is sensitive to any [orderby](https://idl.uw.edu/arquero/api/verbs#orderby) criteria.

- *field*: The data column or derived field.

*Examples*

```js
aq.table({ v: [1, 2, 3, 1] })
  .rollup({ a: op.array_agg('v') }) // a: [ [1, 2, 3, 1] ]
```

---

[#](https://idl.uw.edu/arquero/api/#array_agg_distinct) *op*.**array\_agg\_distinct** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to collect an array of distinct (unique) *field* values. The resulting aggregate is an array (one per group) containing all unique values. The order of values is sensitive to any [orderby](https://idl.uw.edu/arquero/api/verbs#orderby) criteria.

- *field*: The data column or derived field.

*Examples*

```js
aq.table({ v: [1, 2, 3, 1] })
  .rollup({ a: op.array_agg_distinct('v') }) // a: [ [1, 2, 3] ]
```

---

[#](https://idl.uw.edu/arquero/api/#object_agg) *op*.**object\_agg** (*key*, *value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to create an object given input *key* and *value* fields. The resulting aggregate is an object (one per group) with keys and values defined by the input fields. For any keys that occur multiple times in a group, the most recently observed value is used. The order in which keys and values are observed is sensitive to any [orderby](https://idl.uw.edu/arquero/api/verbs#orderby) criteria.

- *key*: The object key field, should be a string or string-coercible value.
- *value* The object value field.

*Examples*

```js
aq.table({ k: ['a', 'b', 'a'], v: [1, 2, 3] })
  .rollup({ o: op.object_agg('k', 'v') }) // o: [ { a: 3, b: 2 } ]
```

---

[#](https://idl.uw.edu/arquero/api/#map_agg) *op*.**map\_agg** (*key*, *value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to create a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) given input *key* and *value* fields. The resulting aggregate is a Map (one per group) with keys and values defined by the input fields. For any keys that occur multiple times in a group, the most recently observed value is used. The order in which keys and values are observed is sensitive to any [orderby](https://idl.uw.edu/arquero/api/verbs#orderby) criteria.

- *key*: The key field.
- *value* The value field.

*Examples*

```js
aq.table({ k: ['a', 'b', 'a'], v: [1, 2, 3] })
  .rollup({ m: op.map_agg('k', 'v') }) // m: [ new Map([['a', 3], ['b', 2]]) ]
```

---

[#](https://idl.uw.edu/arquero/api/#entries_agg) *op*.**entries\_agg** (*key*, *value*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to create an array in the style of [Object.entries](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries) given input *key* and *value* fields. The resulting aggregate is an array (one per group) with \[key, value\] arrays defined by the input fields, and may include duplicate keys. The order of entries is sensitive to any [orderby](https://idl.uw.edu/arquero/api/verbs#orderby) criteria.

- *key*: The key field.
- *value* The value field.

*Examples*

```js
aq.table({ k: ['a', 'b', 'a'], v: [1, 2, 3] })
  .rollup({ e: op.entries_agg('k', 'v') }) // e: [ [['a', 1], ['b', 2], ['a', 3]] ]
```

  

## Window Functions

Window table expression functions applicable over ordered table rows. If invoked outside a table expression context, column (field) inputs must be column name strings, and the operator will return a corresponding table expression.

---

[#](https://idl.uw.edu/arquero/api/#row_number) *op*.**row\_number** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign consecutive row numbers, starting from 1.

---

[#](https://idl.uw.edu/arquero/api/#rank) *op*.**rank** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a rank to each value in a group, starting from 1. Peer values are assigned the same rank. Subsequent ranks reflect the number of prior values: if the first two values tie for rank 1, the third value is assigned rank 3.

---

[#](https://idl.uw.edu/arquero/api/#avg_rank) *op*.**avg\_rank** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a fractional (average) rank to each value in a group, starting from 1. Peer values are assigned the average of their indices: if the first two values tie, both will be assigned rank 1.5.

---

[#](https://idl.uw.edu/arquero/api/#dense_rank) *op*.**dense\_rank** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a dense rank to each value in a group, starting from 1. Peer values are assigned the same rank. Subsequent ranks do not reflect the number of prior values: if the first two values tie for rank 1, the third value is assigned rank 2.

---

[#](https://idl.uw.edu/arquero/api/#percent_rank) *op*.**percent\_rank** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a percentage rank to each value in a group. The percent is calculated as *(rank - 1) / (group\_size - 1)*.

---

[#](https://idl.uw.edu/arquero/api/#cume_dist) *op*.**cume\_dist** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a cumulative distribution value between 0 and 1 to each value in a group.

---

[#](https://idl.uw.edu/arquero/api/#ntile) *op*.**ntile** (*num*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a quantile (e.g., percentile) value to each value in a group. Accepts an integer parameter indicating the number of buckets to use (e.g., 100 for percentiles, 5 for quintiles).

- *num*: The number of buckets for ntile calculation.

---

[#](https://idl.uw.edu/arquero/api/#lag) *op*.**lag** (*field* \[, *offset*, *defaultValue*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a value that precedes the current value by a specified number of positions. If no such value exists, returns a default value instead.

- *field*: The data column or derived field.
- *offset*: The lag offset (default `1`) from the current value.
- *defaultValue*: The default value (default `undefined`).

---

[#](https://idl.uw.edu/arquero/api/#lead) *op*.**lead** (*field* \[, *offset*, *defaultValue*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a value that follows the current value by a specified number of positions. If no such value exists, returns a default value instead.

- *field*: The data column or derived field.
- *offset*: The lead offset (default `1`) from the current value.
- *defaultValue*: The default value (default `undefined`).

---

[#](https://idl.uw.edu/arquero/api/#first_value) *op*.**first\_value** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign the first value in a sliding window frame.

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#last_value) *op*.**last\_value** (*field*) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign the last value in a sliding window frame.

- *field*: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#nth_value) *op*.**nth\_value** (*field* \[, *nth*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign the nth value in a sliding window frame (counting from 1), or `undefined` if no such value exists.

- *field*: The data column or derived field.
- *nth*: The nth position, starting from 1.

---

[#](https://idl.uw.edu/arquero/api/#fill_down) *op*.**fill\_down** (*field* \[, *defaultValue*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to fill in missing values with preceding values. Returns the value at the current window position if it is valid (not `null`, `undefined`, or `NaN`), otherwise returns the first preceding valid value. If no such value exists, returns the default value.

- *field*: The data column or derived field.
- *defaultValue*: The default value (default `undefined`).

---

[#](https://idl.uw.edu/arquero/api/#fill_up) *op*.**fill\_up** (*field* \[, *defaultValue*\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to fill in missing values with subsequent values. Returns the value at the current window position if it is valid (not `null`, `undefined`, or `NaN`), otherwise returns the first subsequent valid value. If no such value exists, returns the default value.

- *field*: The data column or derived field.
- *defaultValue*: The default value (default `undefined`).
