---
title: 'Operations | Arquero API Reference'
source: 'https://idl.uw.edu/arquero/api/op'
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

| [Top-Level](https://idl.uw.edu/arquero/api) | [Table](https://idl.uw.edu/arquero/api/table) | [Verbs](https://idl.uw.edu/arquero/api/verbs) | [**Op Functions**](https://idl.uw.edu/arquero/api/op) | [Expressions](https://idl.uw.edu/arquero/api/expressions) | [Extensibility](https://idl.uw.edu/arquero/api/extensibility) |
| ------------------------------------------- | --------------------------------------------- | --------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |

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
  - [array_agg](https://idl.uw.edu/arquero/api/#array_agg), [array_agg_distinct](https://idl.uw.edu/arquero/api/#array_agg_distinct), [object_agg](https://idl.uw.edu/arquero/api/#object_agg), [map_agg](https://idl.uw.edu/arquero/api/#map_agg), [entries_agg](https://idl.uw.edu/arquero/api/#entries_agg)
- [Window Functions](https://idl.uw.edu/arquero/api/#window-functions)
  - [row_number](https://idl.uw.edu/arquero/api/#row_number), [rank](https://idl.uw.edu/arquero/api/#rank), [avg_rank](https://idl.uw.edu/arquero/api/#avg_rank), [dense_rank](https://idl.uw.edu/arquero/api/#dense_rank)
  - [percent_rank](https://idl.uw.edu/arquero/api/#percent_rank), [cume_dist](https://idl.uw.edu/arquero/api/#cume_dist), [ntile](https://idl.uw.edu/arquero/api/#ntile)
  - [lag](https://idl.uw.edu/arquero/api/#lag), [lead](https://idl.uw.edu/arquero/api/#lead), [first_value](https://idl.uw.edu/arquero/api/#first_value), [last_value](https://idl.uw.edu/arquero/api/#last_value), [nth_value](https://idl.uw.edu/arquero/api/#nth_value)
  - [fill_down](https://idl.uw.edu/arquero/api/#fill_down), [fill_up](https://idl.uw.edu/arquero/api/#fill_up)

## Standard Functions

Standard library of table expression functions. The [`op` object](https://idl.uw.edu/arquero/api/#op) exports these as standard JavaScript functions that behave the same whether invoked inside or outside a table expression context.

### Array Functions

---

[#](https://idl.uw.edu/arquero/api/#compact) _op_.**compact** (_array_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Returns a new compacted array with invalid values (`null`, `undefined`, `NaN`) removed.

- _array_: The array to compact.

_Examples_

```js
op.compact([1, null, 2, undefined, NaN, 3]); // [ 1, 2, 3 ]
```

---

[#](https://idl.uw.edu/arquero/api/#concat) _op_.**concat** (_…values_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Merges two or more arrays in sequence, returning a new array.

- _values_: The arrays to merge.

---

[#](https://idl.uw.edu/arquero/api/#includes) _op_.**includes** (_array_, _value_ \[, _index_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Determines whether an _array_ includes a certain _value_ among its entries, returning `true` or `false` as appropriate.

- _array_: The input array value.
- _value_: The value to search for.
- _index_: The integer index to start searching from (default `0`).

---

[#](https://idl.uw.edu/arquero/api/#indexof) _op_.**indexof** (_sequence_, _value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Returns the first index at which a given _value_ can be found in the _sequence_ (array or string), or -1 if it is not present.

- _sequence_: The input array or string value.
- _value_: The value to search for.

---

[#](https://idl.uw.edu/arquero/api/#join) _op_.**join** (_array_ \[, _delimiter_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Creates and returns a new string by concatenating all of the elements in an _array_ (or an array-like object), separated by commas or a specified _delimiter_ string. If the _array_ has only one item, then that item will be returned without using the delimiter.

- _array_: The input array value.
- _delimiter_: The delimiter string (default `','`).

---

[#](https://idl.uw.edu/arquero/api/#lastindexof) _op_.**lastindexof** (_sequence_, _value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Returns the last index at which a given _value_ can be found in the _sequence_ (array or string), or -1 if it is not present.

- _sequence_: The input array or string value.
- _value_: The value to search for.

---

[#](https://idl.uw.edu/arquero/api/#length) _op_.**length** (_sequence_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Returns the length of the input _sequence_ (array or string).

- _sequence_: The input array or string value.

---

[#](https://idl.uw.edu/arquero/api/#pluck) _op_.**pluck** (_array_, _property_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Returns a new array in which the given _property_ has been extracted for each element in the input _array_.

- _array_: The input array value.
- _property_: The property name string to extract. Nested properties are not supported: the input `"a.b"` will indicates a property with that exact name, _not_ a nested property `"b"` of the object `"a"`.

---

[#](https://idl.uw.edu/arquero/api/#reverse) _op_.**reverse** (_sequence_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Returns a new array or string with the element order reversed: the first _sequence_ element becomes the last, and the last _sequence_ element becomes the first. The input _sequence_ is unchanged.

- _sequence_: The input array or string value.

---

[#](https://idl.uw.edu/arquero/api/#sequence) _op_.**sequence** (\[_start_,\] _stop_ \[, _step_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/sequence.js)

Returns an array containing an arithmetic sequence from the _start_ value to the _stop_ value, in _step_ increments. If _step_ is positive, the last element is the largest _start + i \* step_ less than _stop_; if _step_ is negative, the last element is the smallest _start + i \* step_ greater than _stop_. If the returned array would contain an infinite number of values, an empty range is returned.

- _start_: The starting value of the sequence (default `0`).
- _stop_: The stopping value of the sequence. The stop value is exclusive; it is not included in the result.
- _step_: The step increment between sequence values (default `1`).

---

[#](https://idl.uw.edu/arquero/api/#slice) _op_.**slice** (_sequence_ \[, _start_, _end_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/array.js)

Returns a copy of a portion of the input _sequence_ (array or string) selected from _start_ to _end_ (_end_ not included) where _start_ and _end_ represent the index of items in the sequence.

- _sequence_: The input array or string value.
- _start_: The starting integer index to copy from (inclusive, default `0`).
- _end_: The ending integer index to copy from (exclusive, default `sequence.length`).

### Date Functions

---

[#](https://idl.uw.edu/arquero/api/#now) _op_.**now** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the current time as the number of milliseconds elapsed since January 1, 1970 00:00:00 UTC.

---

_op_.**timestamp** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the timestamp for a _date_ as the number of milliseconds elapsed since January 1, 1970 00:00:00 UTC.

- _date_: The input Date value.

---

[#](https://idl.uw.edu/arquero/api/#datetime) _op_.**datetime** (\[_year_, _month_, _date_, _hours_, _minutes_, _seconds_, _milliseconds_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Creates and returns a new Date value. If no arguments are provided, the current date and time are used.

- _year_: The year.
- _month_ The (zero-based) month (default `0`).
- _date_ The date within the month (default `1`).
- hours: The hour within the day (default `0`).
- _minutes_: The minute within the hour (default `0`).
- _seconds_: The second within the minute (default `0`).
- _milliseconds_: The milliseconds within the second (default `0`).

---

[#](https://idl.uw.edu/arquero/api/#year) _op_.**year** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the year of the specified _date_ according to local time.

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#quarter) _op_.**quarter** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the zero-based quarter of the specified _date_ according to local time.

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#month) _op_.**month** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the zero-based month of the specified _date_ according to local time. A value of `0` indicates January, `1` indicates February, and so on.

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#week) _op_.**week** (_date_ \[, _firstday_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the week number of the year (0-53) for the specified _date_ according to local time. By default, Sunday is used as the first day of the week. All days in a new year preceding the first Sunday are considered to be in week 0.

- _date_: The input Date or timestamp value.
- _firstday_: Number of first day of the week (default `0` for Sunday, `1` for Monday and so on).

---

_op_.**date** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the date (day of month) of the specified _date_ according to local time.

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#dayofyear) _op_.**dayofyear** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the day of the year (1-366) of the specified _date_ according to local time.

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#dayofweek) _op_.**dayofweek** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the Sunday-based day of the week (0-6) of the specified _date_ according to local time. A value of `0` indicates Sunday, `1` indicates Monday, and so on.

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#hours) _op_.**hours** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the hour of the day for the specified _date_ according to local time.

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#minutes) _op_.**minutes** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the minute of the hour for the specified _date_ according to local time.

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#seconds) _op_.**seconds** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the seconds of the minute for the specified _date_ according to local time.

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#milliseconds) _op_.**milliseconds** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the milliseconds of the second for the specified _date_ according to local time.

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcdatetime) _op_.**utcdatetime** (\[_year_, _month_, _date_, _hours_, _minutes_, _seconds_, _milliseconds_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Creates and returns a new Date value using [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time). If no arguments are provided, the current date and time are used.

- _year_: The year.
- _month_ The (zero-based) month (default `0`).
- _date_ The date within the month (default `1`).
- hours: The hour within the day (default `0`).
- _minutes_: The minute within the hour (default `0`).
- _seconds_: The second within the minute (default `0`).
- _milliseconds_: The milliseconds within the second (default `0`).

---

[#](https://idl.uw.edu/arquero/api/#utcyear) _op_.**utcyear** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the year of the specified _date_ according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcquarter) _op_.**utcquarter** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the zero-based quarter of the specified _date_ according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcmonth) _op_.**utcmonth** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the zero-based month of the specified _date_ according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time). A value of `0` indicates January, `1` indicates February, and so on.

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcweek) _op_.**utcweek** (_date_ \[, _firstday_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the week number of the year (0-53) for the specified _date_ according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time). By default, Sunday is used as the first day of the week. All days in a new year preceding the first Sunday are considered to be in week 0.

- _date_: The input Date or timestamp value.
- _firstday_: Number of first day of the week (default `0` for Sunday, `1` for Monday and so on).

---

[#](https://idl.uw.edu/arquero/api/#utcdate) _op_.**utcdate** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the date (day of month) of the specified _date_ according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcdayofyear) _op_.**utcdayofyear** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the day of the year (1-366) of the specified _date_ according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcdayofweek) _op_.**utcdayofweek** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the Sunday-based day of the week (0-6) of the specified _date_ according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time). A value of `0` indicates Sunday, `1` indicates Monday, and so on.

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utchours) _op_.**utchours** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the hour of the day for the specified _date_ according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcminutes) _op_.**utcminutes** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the minute of the hour for the specified _date_ according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcseconds) _op_.**utcseconds** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the seconds of the minute for the specified _date_ according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#utcmilliseconds) _op_.**utcmilliseconds** (_date_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns the milliseconds of the second for the specified _date_ according to [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time).

- _date_: The input Date or timestamp value.

---

[#](https://idl.uw.edu/arquero/api/#format_date) _op_.**format_date** (_date_ \[, _shorten_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns an [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) formatted string for the given _date_ in local timezone. The resulting string is compatible with [parse_date](https://idl.uw.edu/arquero/api/#parse_date) and JavaScript’s built-in [Date.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse).

- _date_: The input Date or timestamp value.
- _shorten_: A boolean flag (default `false`) indicating if the formatted string should be shortened if possible. For example, the local date `2001-01-01` will shorten from `"2001-01-01T00:00:00.000"` to `"2001-01-01T00:00"`.

---

[#](https://idl.uw.edu/arquero/api/#format_utcdate) _op_.**format_utcdate** (_date_ \[, _shorten_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/date.js)

Returns an [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) formatted string for the given _date_ in [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time). The resulting string is compatible with [parse_date](https://idl.uw.edu/arquero/api/#parse_date) and JavaScript’s built-in [Date.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse).

- _date_: The input Date or timestamp value.
- _shorten_: A boolean flag (default `false`) indicating if the formatted string should be shortened if possible. For example, the UTC date `2001-01-01` will shorten from `"2001-01-01T00:00:00.000Z"` to `"2001-01-01"`.

### JSON Functions

Functions for parsing and generating strings formatted using [JavaScript Object Notation (JSON)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON).

---

[#](https://idl.uw.edu/arquero/api/#parse_json) _op_.**parse_json** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/json.js)

Parses a string _value_ in [JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON) format, constructing the JavaScript value or object described by the string.

- _value_: The input string value.

---

[#](https://idl.uw.edu/arquero/api/#to_json) _op_.**to_json** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/json.js)

Converts a JavaScript object or value to a [JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON) string.

- _value_: The value to convert to a JSON string.

### Math Functions

---

[#](https://idl.uw.edu/arquero/api/#bin) _op_.**bin** (_value_, _min_, _max_, _step_ \[, _offset_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/bin.js)

Truncate a _value_ to a bin boundary. Useful for creating equal-width histograms. Values outside the `[min, max]` range will be mapped to `-Infinity` (_value < min_) or `+Infinity` (_value > max_).

- _value_: The number value to bin.
- _min_: The minimum bin boundary value.
- _max_: The maximum bin boundary value.
- _step_: The step size between bin boundaries.
- _offset_: Offset in steps (default `0`) by which to adjust the returned bin value. An offset of `1` returns the next boundary.

---

[#](https://idl.uw.edu/arquero/api/#random) _op_.**random** () · [Source](https://github.com/uwdata/arquero/blob/master/src/util/random.js)

Return a random floating point number between 0 (inclusive) and 1 (exclusive). By default uses [Math.random](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random). Use the [seed](https://idl.uw.edu/arquero/api/#seed) method to instead use a seeded random number generator.

---

[#](https://idl.uw.edu/arquero/api/#is_nan) _op_.**is_nan** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Tests if the input _value_ is not a number (`NaN`); equivalent to [Number.isNaN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN). The method will return `true` only if the input _value_ is an actual numeric `NaN` value; it will return `false` for other types (booleans, strings, _etc_.).

- _value_: The value to test.

_Examples_

```js
op.is_nan(NaN); // true
op.is_nan(0 / 0); // true
op.is_nan(op.sqrt(-1)); // true
```

```js
op.is_nan('foo'); // false
op.is_nan(+'foo'); // true, coerce to number first
```

```js
op.is_nan(true); // false
op.is_nan(+true); // false, booleans coerce to numbers
```

```js
op.is_nan(undefined); // false
op.is_nan(+undefined); // true, coerce to number first
```

```js
op.is_nan(null); // false
op.is_nan(+null); // false, null coerces to zero
```

---

[#](https://idl.uw.edu/arquero/api/#is_finite) _op_.**is_finite** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Tests if the input _value_ is finite; equivalent to [Number.isFinite](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite).

- _value_: The value to test.

---

[#](https://idl.uw.edu/arquero/api/#abs) _op_.**abs** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the absolute value of the input _value_; equivalent to [Math.abs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/abs).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#cbrt) _op_.**cbrt** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the cube root value of the input _value_; equivalent to [Math.cbrt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/cbrt).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#ceil) _op_.**ceil** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the ceiling of the input _value_, the nearest integer equal to or greater than the input; equivalent to [Math.ceil](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/ceil).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#clz32) _op_.**clz32** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the number of leading zero bits in the 32-bit binary representation of a number _value_; equivalent to [Math.clz32](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#exp) _op_.**exp** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns _e <sup>value</sup>_, where _e_ is Euler’s number, the base of the natural logarithm; equivalent to [Math.exp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/exp).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#expm1) _op_.**expm1** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns _e <sup>value</sup> - 1_, where _e_ is Euler’s number, the base of the natural logarithm; equivalent to [Math.expm1](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/expm1).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#floor) _op_.**floor** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the floor of the input _value_, the nearest integer equal to or less than the input; equivalent to [Math.floor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/floor).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#fround) _op_.**fround** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the nearest 32-bit single precision float representation of the input number _value_; equivalent to [Math.fround](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/fround). Useful for translating between 64-bit `Number` values and values from a `Float32Array`.

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#greatest) _op_.**greatest** (_…values_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the greatest (maximum) value among the input _values_; equivalent to [Math.max](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max). This is _not_ an aggregate function, see [op.max](https://idl.uw.edu/arquero/api/#max) to compute a maximum value across multiple rows.

- _values_: Zero or more input values.

---

[#](https://idl.uw.edu/arquero/api/#least) _op_.**least** (_…values_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the least (minimum) value among the input _values_; equivalent to [Math.min](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/min). This is _not_ an aggregate function, see [op.min](https://idl.uw.edu/arquero/api/#min) to compute a minimum value across multiple rows.

- _values_: Zero or more input values.

---

[#](https://idl.uw.edu/arquero/api/#log) _op_.**log** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the natural logarithm (base _e_) of a number _value_; equivalent to [Math.log](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#log10) _op_.**log10** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the base 10 logarithm of a number _value_; equivalent to [Math.log10](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log10).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#log1p) _op_.**log1p** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the natural logarithm (base _e_) of 1 + a number _value_; equivalent to [Math.log1p](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log1p).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#log2) _op_.**log2** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the base 2 logarithm of a number _value_; equivalent to [Math.log2](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log2).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#pow) _op_.**pow** (_base_, _exponent_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the _base_ raised to the _exponent_ power, that is, _base_ <sup><em>exponent</em></sup>; equivalent to [Math.pow](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/pow).

- _base_: The base number value.
- _exponent_: The exponent number value.

---

[#](https://idl.uw.edu/arquero/api/#round) _op_.**round** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the value of a number rounded to the nearest integer;; equivalent to [Math.round](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#sign) _op_.**sign** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns either a positive or negative +/- 1, indicating the sign of the input _value_; equivalent to [Math.sign](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sign).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#sqrt) _op_.**sqrt** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the square root of the input _value_; equivalent to [Math.sqrt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sqrt).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#trunc) _op_.**trunc** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the integer part of a number by removing any fractional digits; equivalent to [Math.trunc](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/trunc).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#degrees) _op_.**degrees** (_radians_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Converts the input _radians_ value to degrees.

- _value_: The input number value in radians.

---

[#](https://idl.uw.edu/arquero/api/#radians) _op_.**radians** (_radians_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Converts the input _degrees_ value to radians.

- _value_: The input number value in degrees.

---

[#](https://idl.uw.edu/arquero/api/#acos) _op_.**acos** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the arc-cosine (in radians) of a number _value_; equivalent to [Math.acos](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/acos).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#acosh) _op_.**acosh** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the hyperbolic arc-cosine of a number _value_; equivalent to [Math.acosh](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/acosh).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#asin) _op_.**asin** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the arc-sine (in radians) of a number _value_; equivalent to [Math.asin](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/asin).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#asinh) _op_.**asinh** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the hyperbolic arc-sine of a number _value_; equivalent to [Math.asinh](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/asinh).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#atan) _op_.**atan** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the arc-tangent (in radians) of a number _value_; equivalent to [Math.atan](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/atan).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#atan2) _op_.**atan2** (_y_, _x_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the angle in the plane (in radians) between the positive x-axis and the ray from (0, 0) to the point (_x_, _y_);; equivalent to [Math.atan2](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/atan2).

- _y_: The y coordinate of the point.
- _x_: The x coordinate of the point.

---

[#](https://idl.uw.edu/arquero/api/#atanh) _op_.**atanh** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the hyperbolic arc-tangent of a number _value_; equivalent to [Math.atanh](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/atanh).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#cos) _op_.**cos** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the cosine (in radians) of a number _value_; equivalent to [Math.cos](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/cos).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#cosh) _op_.**cosh** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the hyperbolic cosine of a number _value_; equivalent to [Math.cosh](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/cosh).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#sin) _op_.**sin** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the sine (in radians) of a number _value_; equivalent to [Math.sin](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sin).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#sinh) _op_.**sinh** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the hyperbolic sine of a number _value_; equivalent to [Math.sinh](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sinh).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#tan) _op_.**tan** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the tangent (in radians) of a number _value_; equivalent to [Math.tan](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/tan).

- _value_: The input number value.

---

[#](https://idl.uw.edu/arquero/api/#tanh) _op_.**tanh** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/math.js)

Returns the hyperbolic tangent of a number _value_; equivalent to [Math.tanh](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/tanh).

- _value_: The input number value.

### Object Functions

---

[#](https://idl.uw.edu/arquero/api/#equal) _op_.**equal** (_a_, _b_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/equal.js)

Compare two values for equality, using join semantics in which `null !== null`. If the inputs are object-valued, a deep equality check of array entries or object key-value pairs is performed. The method is helpful within custom [join](https://idl.uw.edu/arquero/api/verbs/#join) condition expressions.

- _a_: The first input to compare.
- _b_: The second input to compare.

---

[#](https://idl.uw.edu/arquero/api/#has) _op_.**has** (_object_, _key_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/object.js)

Returns a boolean indicating whether the _object_ has the specified _key_ as its own property (as opposed to inheriting it). If the _object_ is a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) or [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) instance, the `has` method will be invoked directly on the object, otherwise `Object.hasOwnProperty` is used.

- _object_: The object, Map, or Set to test for property membership.
- _key_: The string key (property name) to test for.

---

[#](https://idl.uw.edu/arquero/api/#keys) _op_.**keys** (_object_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/object.js)

Returns an array of a given _object_ ’s own enumerable property names. If the _object_ is a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) instance, the `keys` method will be invoked directly on the object, otherwise `Object.keys` is used.

- _object_: The input object or Map value.

---

[#](https://idl.uw.edu/arquero/api/#values) _op_.**values** (_object_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/object.js)

Returns an array of a given _object_ ’s own enumerable property values. If the _object_ is a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) or [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) instance, the `values` method will be invoked directly on the object, otherwise `Object.values` is used.

- _object_: The input object, Map, or Set value.

---

[#](https://idl.uw.edu/arquero/api/#entries) _op_.**entries** (_object_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/object.js)

Returns an array of a given _object_ ’s own enumerable string-keyed property `[key, value]` pairs. If the _object_ is a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) or [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) instance, the `entries` method will be invoked directly on the object, otherwise `Object.entries` is used.

- _object_: The input object, Map, or Set value.

---

[#](https://idl.uw.edu/arquero/api/#object) _op_.**object** (_entries_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/object.js)

Returns a new object given an iterable _entries_ argument of `[key, value]` pairs. This method is Arquero’s version of the standard [Object.fromEntries](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/fromEntries) method.

- _entries_: An iterable collection of `[key, value]` pairs, such as an array of two-element arrays or a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map).

---

[#](https://idl.uw.edu/arquero/api/#recode) _op_.**recode** (_value_, _map_ \[, _fallback_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/recode.js)

Recodes an input _value_ to an alternative value, based on a provided value _map_ object. If a _fallback_ value is specified, it will be returned when the input value is not found in the map; otherwise, the input value is returned unchanged.

- _value_: The value to recode. The value must be safely coercible to a string for lookup against the value map.
- _map_: An object or [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) with input values for keys and recoded values for values. If a non-Map object, only the object’s own properties will be considered; inherited properties on the prototype chain are ignored.
- _fallback_: An optional fallback value to use if the input value is not found in the value map. If a fallback is not specified, the input value will be returned unchanged when not found in the map.

_Examples_

```js
// recode values in a derive statement
table.derive({ val: (d) => op.recode(d.val, { 'opt:a': 'A', 'opt:b': 'B' }) });
```

```js
// define value map externally, bind as parameter
const map = { 'opt:a': 'A', 'opt:b': 'B' };
table.params({ map }).derive({ val: (d, $) => op.recode(d.val, $.map, '?') });
```

```js
// using a Map object, bind as parameter
const map = new Map().set('opt:a', 'A').set('opt:b', 'B');
table.params({ map }).derive({ val: (d, $) => op.recode(d.val, $.map, '?') });
```

---

[#](https://idl.uw.edu/arquero/api/#row_object) _op_.**row_object** (\[_…columns_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/op-api.js)

Generate a new object containing the data for the current table row. The new object maps from column name keys to table values for the current row. The optional _columns_ list indicates which columns to include in the object; if unspecified, all columns are included by default.

This method can only be invoked within a single-table expression. Calling this method in a multi-table expression (such as for a join) results in an error. An error will also result if any provided column names are specified using dynamic lookups of table column values.

- _columns_: A list of column names or indices to include in the object.

_Examples_

```js
aq.table({ a: [1, 3], b: [2, 4] })
  .derive({ row: op.row_object() })
  .get('row', 0); // { a: 1, b: 2 }
```

```js
// rollup a table into an array of row objects
table.rollup({ rows: (d) => op.array_agg(op.row_object()) });
```

### String Functions

---

[#](https://idl.uw.edu/arquero/api/#parse_date) _op_.**parse_date** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Parses a string _value_ and returns a Date instance. Beware: this method uses JavaScript’s [`Date.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse) functionality, which is inconsistently implemented across browsers. That said, [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) formatted strings such as those produced by [format_date](https://idl.uw.edu/arquero/api/#format_date) and [format_utcdate](https://idl.uw.edu/arquero/api/#format_utcdate) should be supported across platforms. Note that “bare” ISO date strings such as `"2001-01-01"` are interpreted by JavaScript as indicating midnight of that day in [Coordinated Universal Time (UTC)](https://en.wikipedia.org/wiki/Coordinated_Universal_Time), _not_ local time. To indicate the local timezone, an ISO string can include additional time components and no `Z` suffix: `"2001-01-01T00:00"`.

- _value_: The input value.

---

[#](https://idl.uw.edu/arquero/api/#parse_float) _op_.**parse_float** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Parses a string _value_ and returns a floating point number.

- _value_: The input value.

---

[#](https://idl.uw.edu/arquero/api/#parse_int) _op_.**parse_int** (_value_ \[, _radix_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Parses a string _value_ and returns an integer of the specified radix (the base in mathematical numeral systems).

- _value_: The input value.
- _radix_: An integer between 2 and 36 that represents the radix (the base in mathematical numeral systems) of the string. Be careful: this does not default to 10! If _radix_ is `undefined`, `0`, or unspecified, JavaScript assumes the following: If the input string begins with `"0x"` or `"0X"` (a zero, followed by lowercase or uppercase X), the radix is assumed to be 16 and the rest of the string is parsed as a hexidecimal number. If the input string begins with `"0"` (a zero), the radix is assumed to be 8 (octal) or 10 (decimal). Exactly which radix is chosen is implementation-dependent. If the input string begins with any other value, the radix is 10 (decimal).

---

[#](https://idl.uw.edu/arquero/api/#endswith) _op_.**endswith** (_value_, _search_ \[, _length_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Determines whether a string _value_ ends with the characters of a specified _search_ string, returning `true` or `false` as appropriate.

- _value_: The input string value.
- _search_: The search string to test for.
- _length_: If provided, used as the length of _value_ (default `value.length`).

---

[#](https://idl.uw.edu/arquero/api/#match) _op_.**match** (_value_, _regexp_ \[, _index_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Retrieves the result of matching a string _value_ against a regular expression _regexp_. If no _index_ is specified, returns an array whose contents depend on the presence or absence of the regular expression global (`g`) flag, or `null` if no matches are found. If the `g` flag is used, all results matching the complete regular expression will be returned, but capturing groups will not. If the `g` flag is not used, only the first complete match and its related capturing groups are returned.

If specified, the _index_ looks up a value of the resulting match. If _index_ is a number, the corresponding index of the result array is returned. If _index_ is a string, the value of the corresponding [named capture group](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Groups_and_Ranges) is returned, or `null` if there is no such group.

- _value_: The input string value.
- _regexp_: The [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) to match against.
- _index_: The index into the match result array or capture group.

_Examples_

```js
// returns ['1', '2', '3']
op.match('1 2 3', /\d+/g);
```

```js
// returns '2' (index into match array)
op.match('1 2 3', /\d+/g, 1);
```

```js
// returns '3' (index of capture group)
op.match('1 2 3', /\d+ \d+ (\d+)/, 1);
```

```js
// returns '2' (named capture group)
op.match('1 2 3', /\d+ (?<digit>\d+)/, 'digit');
```

---

[#](https://idl.uw.edu/arquero/api/#normalize) _op_.**normalize** (_value_ \[, _form_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Returns the Unicode normalization form of the string _value_.

- _value_: The input string to normalize.
- _form_: The Unicode normalization form, one of `'NFC'` (default, canonical decomposition, followed by canonical composition), `'NFD'` (canonical decomposition), `'NFKC'` (compatibility decomposition, followed by canonical composition), or `'NFKD'` (compatibility decomposition).

---

[#](https://idl.uw.edu/arquero/api/#padend) _op_.**padend** (_value_, _length_ \[, _fill_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Pad a string _value_ with a given _fill_ string (applied from the end of _value_ and repeated, if needed) so that the resulting string reaches a given _length_.

- _value_: The input string to pad.
- _length_: The length of the resulting string once the _value_ string has been padded. If the length is lower than `value.length`, the _value_ string will be returned as-is.
- _fill_: The string to pad the _value_ string with (default `''`). If _fill_ is too long to stay within the target _length_, it will be truncated: for left-to-right languages the left-most part and for right-to-left languages the right-most will be applied.

---

[#](https://idl.uw.edu/arquero/api/#padstart) _op_.**padstart** (_value_, _length_ \[, _fill_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Pad a string _value_ with a given _fill_ string (applied from the start of _value_ and repeated, if needed) so that the resulting string reaches a given _length_.

- _value_: The input string to pad.
- _length_: The length of the resulting string once the _value_ string has been padded. If the length is lower than `value.length`, the _value_ string will be returned as-is.
- _fill_: The string to pad the _value_ string with (default `''`). If _fill_ is too long to stay within the target _length_, it will be truncated: for left-to-right languages the left-most part and for right-to-left languages the right-most will be applied.

---

[#](https://idl.uw.edu/arquero/api/#lower) _op_.**lower** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Returns the string _value_ converted to lower case.

- _value_: The input string value.

---

[#](https://idl.uw.edu/arquero/api/#upper) _op_.**upper** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Returns the string _value_ converted to upper case.

- _value_: The input string value.

---

[#](https://idl.uw.edu/arquero/api/#repeat) _op_.**repeat** (_value_, _number_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Returns a new string which contains the specified _number_ of copies of the _value_ string concatenated together.

- _value_: The input string to repeat.
- _number_: An integer between `0` and `+Infinity`, indicating the number of times to repeat the string.

---

[#](https://idl.uw.edu/arquero/api/#replace) _op_.**replace** (_value_, _pattern_, _replacement_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Returns a new string with some or all matches of a _pattern_ replaced by a _replacement_. The _pattern_ can be a string or a regular expression, and the _replacement_ must be a string. If _pattern_ is a string, only the first occurrence will be replaced; to make multiple replacements, use a regular expression _pattern_ with a `g` (global) flag.

- _value_: The input string value.
- _pattern_: The pattern string or regular expression to replace.
- _replacement_: The replacement string to use.

---

[#](https://idl.uw.edu/arquero/api/#split) _op_.**split** (_value_, _separator_ \[, _limit_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Divides a string _value_ into an ordered list of substrings based on a _separator_ pattern, puts these substrings into an array, and returns the array.

- _value_: The input string value.
- _separator_: A string or regular expression pattern describing where each split should occur.
- _limit_: An integer specifying a limit on the number of substrings to be included in the array.

---

[#](https://idl.uw.edu/arquero/api/#startswith) _op_.**startswith** (_value_, _search_ \[, _position_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Determines whether a string _value_ starts with the characters of a specified _search_ string, returning `true` or `false` as appropriate.

- _value_: The input string value.
- _search_: The search string to test for.
- _position_: The position in the _value_ string at which to begin searching (default `0`).

---

[#](https://idl.uw.edu/arquero/api/#substring) _op_.**substring** (_value_ \[, _start_, _end_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Returns the part of the string _value_ between the _start_ and _end_ indexes, or to the end of the string.

- _value_: The input string value.
- _start_: The index of the first character to include in the returned substring (default `0`).
- _end_: The index of the first character to exclude from the returned substring (default `value.length`).

---

[#](https://idl.uw.edu/arquero/api/#trim) _op_.**trim** (_value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/functions/string.js)

Returns a new string with whitespace removed from both ends of the input _value_ string. Whitespace in this context is all the whitespace characters (space, tab, no-break space, etc.) and all the line terminator characters (LF, CR, etc.).

- _value_: The input string value to trim.

## Aggregate Functions

Aggregate table expression functions for summarizing values. If invoked outside a table expression context, column (field) inputs must be column name strings, and the operator will return a corresponding table expression.

---

[#](https://idl.uw.edu/arquero/api/#any) _op_.**any** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function returning an arbitrary observed value (typically the first encountered).

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#bins) _op_.**bins** (_field_ \[, _maxbins_, _nice_, _minstep_, _step_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for calculating a binning scheme in terms of the minimum bin boundary, maximum bin boundary, and step size.

- _field_: The data column or derived field.
- _maxbins_: The maximum number of allowed bins (default `15`).
- _nice_: Boolean flag (default `true`) indicating if the bin min and max should snap to “nice” human-friendly values such as multiples of 10.
- _minstep_: The minimum allowed step size between bins.
- _step_: The exact step size to use between bins. If specified, the _maxbins_ and _minstep_ arguments are ignored.

---

[#](https://idl.uw.edu/arquero/api/#count) _op_.**count** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to count the number of records (rows).

---

[#](https://idl.uw.edu/arquero/api/#distinct) _op_.**distinct** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to count the number of distinct values.

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#valid) _op_.**valid** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to count the number of valid values. Invalid values are `null`, `undefined`, or `NaN`.

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#invalid) _op_.**invalid** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to count the number of invalid values. Invalid values are `null`, `undefined`, or `NaN`.

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#max) _op_.**max** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the maximum value. For a non-aggregate version, see [op.greatest](https://idl.uw.edu/arquero/api/#greatest).

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#min) _op_.**min** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the minimum value. For a non-aggregate version, see [op.least](https://idl.uw.edu/arquero/api/#least).

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#sum) _op_.**sum** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to sum values.

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#product) _op_.**product** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to multiply values.

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#mean) _op_.**mean** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the mean (average) value. This operator is a synonym for [average](https://idl.uw.edu/arquero/api/#average).

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#average) _op_.**average** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the average (mean) value. This operator is a synonym for [mean](https://idl.uw.edu/arquero/api/#mean).

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#mode) _op_.**mode** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to determine the mode (most frequent) value.

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#median) _op_.**median** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the median value. This operation is a shorthand for the [quantile](https://idl.uw.edu/arquero/api/#quantile) value at p = 0.5.

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#quantile) _op_.**quantile** (_field_, _p_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to compute the quantile boundary of a data field for a probability threshold. The [median](https://idl.uw.edu/arquero/api/#median) is the value of quantile at p = 0.5.

- _field_: The data column or derived field.
- _p_: The probability threshold.

---

[#](https://idl.uw.edu/arquero/api/#stdev) _op_.**stdev** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the sample standard deviation.

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#stdevp) _op_.**stdevp** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the population standard deviation.

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#variance) _op_.**variance** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the sample variance.

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#variancep) _op_.**variancep** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the population variance.

---

[#](https://idl.uw.edu/arquero/api/#corr) _op_.**corr** (_field1_, _field2_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the [product-moment correlation](https://en.wikipedia.org/wiki/Pearson_correlation_coefficient) between two variables. To instead compute a [rank correlation](https://en.wikipedia.org/wiki/Spearman%27s_rank_correlation_coefficient), compute the average ranks for each variable and then apply this function to the result.

- _field1_: The first data column or derived field.
- _field2_: The second data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#covariance) _op_.**covariance** (_field1_, _field2_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the sample covariance between two variables.

- _field1_: The first data column or derived field.
- _field2_: The second data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#covariancep) _op_.**covariancep** (_field1_, _field2_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function for the population covariance between two variables.

- _field1_: The first data column or derived field.
- _field2_: The second data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#array_agg) _op_.**array_agg** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to collect an array of _field_ values. The resulting aggregate is an array (one per group) containing all observed values. The order of values is sensitive to any [orderby](https://idl.uw.edu/arquero/api/verbs#orderby) criteria.

- _field_: The data column or derived field.

_Examples_

```js
aq.table({ v: [1, 2, 3, 1] }).rollup({ a: op.array_agg('v') }); // a: [ [1, 2, 3, 1] ]
```

---

[#](https://idl.uw.edu/arquero/api/#array_agg_distinct) _op_.**array_agg_distinct** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to collect an array of distinct (unique) _field_ values. The resulting aggregate is an array (one per group) containing all unique values. The order of values is sensitive to any [orderby](https://idl.uw.edu/arquero/api/verbs#orderby) criteria.

- _field_: The data column or derived field.

_Examples_

```js
aq.table({ v: [1, 2, 3, 1] }).rollup({ a: op.array_agg_distinct('v') }); // a: [ [1, 2, 3] ]
```

---

[#](https://idl.uw.edu/arquero/api/#object_agg) _op_.**object_agg** (_key_, _value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to create an object given input _key_ and _value_ fields. The resulting aggregate is an object (one per group) with keys and values defined by the input fields. For any keys that occur multiple times in a group, the most recently observed value is used. The order in which keys and values are observed is sensitive to any [orderby](https://idl.uw.edu/arquero/api/verbs#orderby) criteria.

- _key_: The object key field, should be a string or string-coercible value.
- _value_ The object value field.

_Examples_

```js
aq.table({ k: ['a', 'b', 'a'], v: [1, 2, 3] }).rollup({ o: op.object_agg('k', 'v') }); // o: [ { a: 3, b: 2 } ]
```

---

[#](https://idl.uw.edu/arquero/api/#map_agg) _op_.**map_agg** (_key_, _value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to create a [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) given input _key_ and _value_ fields. The resulting aggregate is a Map (one per group) with keys and values defined by the input fields. For any keys that occur multiple times in a group, the most recently observed value is used. The order in which keys and values are observed is sensitive to any [orderby](https://idl.uw.edu/arquero/api/verbs#orderby) criteria.

- _key_: The key field.
- _value_ The value field.

_Examples_

```js
aq.table({ k: ['a', 'b', 'a'], v: [1, 2, 3] }).rollup({ m: op.map_agg('k', 'v') }); // m: [ new Map([['a', 3], ['b', 2]]) ]
```

---

[#](https://idl.uw.edu/arquero/api/#entries_agg) _op_.**entries_agg** (_key_, _value_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/aggregate-functions.js)

Aggregate function to create an array in the style of [Object.entries](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries) given input _key_ and _value_ fields. The resulting aggregate is an array (one per group) with \[key, value\] arrays defined by the input fields, and may include duplicate keys. The order of entries is sensitive to any [orderby](https://idl.uw.edu/arquero/api/verbs#orderby) criteria.

- _key_: The key field.
- _value_ The value field.

_Examples_

```js
aq.table({ k: ['a', 'b', 'a'], v: [1, 2, 3] }).rollup({ e: op.entries_agg('k', 'v') }); // e: [ [['a', 1], ['b', 2], ['a', 3]] ]
```

## Window Functions

Window table expression functions applicable over ordered table rows. If invoked outside a table expression context, column (field) inputs must be column name strings, and the operator will return a corresponding table expression.

---

[#](https://idl.uw.edu/arquero/api/#row_number) _op_.**row_number** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign consecutive row numbers, starting from 1.

---

[#](https://idl.uw.edu/arquero/api/#rank) _op_.**rank** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a rank to each value in a group, starting from 1. Peer values are assigned the same rank. Subsequent ranks reflect the number of prior values: if the first two values tie for rank 1, the third value is assigned rank 3.

---

[#](https://idl.uw.edu/arquero/api/#avg_rank) _op_.**avg_rank** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a fractional (average) rank to each value in a group, starting from 1. Peer values are assigned the average of their indices: if the first two values tie, both will be assigned rank 1.5.

---

[#](https://idl.uw.edu/arquero/api/#dense_rank) _op_.**dense_rank** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a dense rank to each value in a group, starting from 1. Peer values are assigned the same rank. Subsequent ranks do not reflect the number of prior values: if the first two values tie for rank 1, the third value is assigned rank 2.

---

[#](https://idl.uw.edu/arquero/api/#percent_rank) _op_.**percent_rank** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a percentage rank to each value in a group. The percent is calculated as _(rank - 1) / (group_size - 1)_.

---

[#](https://idl.uw.edu/arquero/api/#cume_dist) _op_.**cume_dist** () · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a cumulative distribution value between 0 and 1 to each value in a group.

---

[#](https://idl.uw.edu/arquero/api/#ntile) _op_.**ntile** (_num_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a quantile (e.g., percentile) value to each value in a group. Accepts an integer parameter indicating the number of buckets to use (e.g., 100 for percentiles, 5 for quintiles).

- _num_: The number of buckets for ntile calculation.

---

[#](https://idl.uw.edu/arquero/api/#lag) _op_.**lag** (_field_ \[, _offset_, _defaultValue_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a value that precedes the current value by a specified number of positions. If no such value exists, returns a default value instead.

- _field_: The data column or derived field.
- _offset_: The lag offset (default `1`) from the current value.
- _defaultValue_: The default value (default `undefined`).

---

[#](https://idl.uw.edu/arquero/api/#lead) _op_.**lead** (_field_ \[, _offset_, _defaultValue_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign a value that follows the current value by a specified number of positions. If no such value exists, returns a default value instead.

- _field_: The data column or derived field.
- _offset_: The lead offset (default `1`) from the current value.
- _defaultValue_: The default value (default `undefined`).

---

[#](https://idl.uw.edu/arquero/api/#first_value) _op_.**first_value** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign the first value in a sliding window frame.

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#last_value) _op_.**last_value** (_field_) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign the last value in a sliding window frame.

- _field_: The data column or derived field.

---

[#](https://idl.uw.edu/arquero/api/#nth_value) _op_.**nth_value** (_field_ \[, _nth_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to assign the nth value in a sliding window frame (counting from 1), or `undefined` if no such value exists.

- _field_: The data column or derived field.
- _nth_: The nth position, starting from 1.

---

[#](https://idl.uw.edu/arquero/api/#fill_down) _op_.**fill_down** (_field_ \[, _defaultValue_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to fill in missing values with preceding values. Returns the value at the current window position if it is valid (not `null`, `undefined`, or `NaN`), otherwise returns the first preceding valid value. If no such value exists, returns the default value.

- _field_: The data column or derived field.
- _defaultValue_: The default value (default `undefined`).

---

[#](https://idl.uw.edu/arquero/api/#fill_up) _op_.**fill_up** (_field_ \[, _defaultValue_\]) · [Source](https://github.com/uwdata/arquero/blob/master/src/op/window-functions.js)

Window function to fill in missing values with subsequent values. Returns the value at the current window position if it is valid (not `null`, `undefined`, or `NaN`), otherwise returns the first subsequent valid value. If no such value exists, returns the default value.

- _field_: The data column or derived field.
- _defaultValue_: The default value (default `undefined`).
