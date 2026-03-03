# Функції JSON

6 функцій доступно

## is_json

Перевіряє, чи рядок містить валідний JSON

**Параметри:**

- `value` — Рядкове значення для перевірки

**Повертає:** true якщо валідний JSON, false інакше, null якщо вхідне значення null

**Приклади:**

```
is_json('{"name": "Alice"}')
is_json('{"valid": true}') -> true
is_json('invalid') -> false
```

---

## json_extract

Розбирає JSON-рядок та вилучає значення за вказаним шляхом

**Параметри:**

- `value` — Рядок з JSON
- `path` — Шлях у крапковій нотації (напр., "user.name" або "items.0.price")

**Повертає:** Вилучене значення, або null якщо шлях не знайдено або JSON невалідний

**Приклади:**

```
json_extract('{"name":"Alice"}', "name")
json_extract('{"name":"Alice"}', "name") -> "Alice"
json_extract('{"user":{"email":"a@b.com"}}', "user.email") -> "a@b.com"
json_extract('{"items":[{"price":10}]}', "items.0.price") -> 10
```

---

## json_keys

Повертає масив ключів верхнього рівня з JSON-об'єкта

**Параметри:**

- `value` — Рядок з JSON-об'єктом

**Повертає:** Масив імен ключів, або null якщо не є JSON-об'єктом або вхідне значення null

**Приклади:**

```
json_keys('{"name":"Alice","age":30}')
json_keys('{"name":"Alice","age":30}') -> ["name","age"]
json_keys('[1,2,3]') -> null
```

---

## json_array_length

Повертає довжину JSON-масиву

**Параметри:**

- `value` — Рядок з JSON-масивом

**Повертає:** Довжину масиву, або null якщо не є JSON-масивом або вхідне значення null

**Приклади:**

```
json_array_length('[1,2,3]')
json_array_length('[1,2,3]') -> 3
json_array_length('{"a":1}') -> null
```

---

## json_type

Повертає JSON-тип значення верхнього рівня

**Параметри:**

- `value` — Рядок з валідним JSON

**Повертає:** Один з: "object", "array", "string", "number", "boolean", "null", або null якщо невалідне

**Приклади:**

```
json_type('{"a":1}')
json_type('{"a":1}') -> "object"
json_type('[1,2]') -> "array"
json_type('"hello"') -> "string"
```

---

## json_stringify

Перетворює будь-яке значення на його JSON-рядкове представлення

**Параметри:**

- `value` — Будь-яке значення для серіалізації

**Повертає:** JSON-рядкове представлення

**Приклади:**

```
json_stringify(42)
json_stringify(42) -> "42"
json_stringify("hello") -> "\"hello\""
```

---
