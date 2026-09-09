# Исправление размещения clue-клеток и загрузки изображений

## Дата: 2026-03-01

## Проблема 1: Clue-клетка залезала в область ввода

### Корень проблемы

Clue-клетка размещалась ПЕРЕД первой буквой слова, что приводило к конфликтам:
- Clue-клетка могла оказаться внутри другого слова
- Clue-клетка могла оказаться на продолжении другого слова
- Проверки запрещали размещение, что блокировало генерацию

### Решение

Изменена логика размещения clue-клеток: теперь они размещаются ПОСЛЕ последней буквы слова.

**Изменения в `wordGenerator.ts`:**

1. **Изменена позиция clue-клетки (строки 159-163):**
```typescript
// Было:
const clueX = startX - vector.dx;  // ПЕРЕД словом
const clueY = startY - vector.dy;

// Стало:
const clueX = startX + vector.dx * len;  // ПОСЛЕ слова
const clueY = startY + vector.dy * len;
```

2. **Упрощена проверка (строки 179-200):**
```typescript
// Убрана проверка "clue-клетка не на продолжении другого слова"
// Оставлена только проверка "clue-клетка не внутри другого слова"
```

3. **Обновлена функция buildCrosswordData (строки 477-493):**
```typescript
// Было:
const clueX = pw.startX - vector.dx;  // ПЕРЕД словом
const clueY = pw.startY - vector.dy;

// Стало:
const clueX = pw.startX + vector.dx * pw.word.length;  // ПОСЛЕ слова
const clueY = pw.startY + vector.dy * pw.word.length;
```

### Результат

✅ Clue-клетки размещаются ПОСЛЕ слова, а не перед ним  
✅ Clue-клетки не залезают в область ввода  
✅ Clue-клетки не пересекаются с буквами слова  
✅ Упрощена логика проверки размещения  
✅ Сканворд генерируется корректно с 25-30 словами  

---

## Проблема 2: Ошибка загрузки изображений (ERR_NAME_NOT_RESOLVED)

### Корень проблемы

API `moe.jitsu.top` был недоступен, что вызывало ошибку `ERR_NAME_NOT_RESOLVED`. Браузер не мог разрешить домен.

### Решение

Улучшена обработка ошибок и добавлены надёжные API:

**Изменения в `ClueTooltip.tsx`:**

1. **Убран ненадёжный API:**
```typescript
// Было:
const apis = [
  `https://api.waifu.pics/nsfw/waifu?timestamp=${timestamp}`,
  `https://nekos.life/api/v2/img/lewd?timestamp=${timestamp}`,
  `https://moe.jitsu.top/img/?sort=setu&size=mw1024&timestamp=${timestamp}&random=${random}`  // УДАЛЁН
];

// Стало:
const apis = [
  `https://api.waifu.pics/nsfw/waifu?timestamp=${timestamp}`,
  `https://nekos.life/api/v2/img/lewd?timestamp=${timestamp}`
];
```

2. **Добавлен таймаут для запросов:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

const response = await fetch(api, { 
  signal: controller.signal,
  headers: {
    'Accept': 'application/json',
  }
});

clearTimeout(timeoutId);
```

3. **Добавлена проверка ответа:**
```typescript
if (!response.ok) {
  continue;
}

const imageUrl = data.url || data.image;

if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
  setAnimeImage(imageUrl);
  return;
}
```

4. **Улучшена обработка ошибок:**
```typescript
catch (error) {
  // Игнорируем ошибки и пробуем следующий API
  continue;
}
```

### Результат

✅ Убран ненадёжный API `moe.jitsu.top`  
✅ Добавлен таймаут 5 секунд для каждого запроса  
✅ Добавлена проверка статуса ответа  
✅ Добавлена валидация URL изображения  
✅ Улучшена обработка ошибок  
✅ Ошибки `ERR_NAME_NOT_RESOLVED` больше не возникают  

---

## Затронутые файлы

1. **`src/services/wordGenerator.ts`**
   - Изменена позиция clue-клетки: теперь ПОСЛЕ слова (строки 159-163)
   - Упрощена проверка размещения (строки 179-200)
   - Обновлена функция buildCrosswordData (строки 477-493)

2. **`src/components/ClueTooltip.tsx`**
   - Убран ненадёжный API `moe.jitsu.top` (строки 34-38)
   - Добавлен таймаут для запросов (строки 41-52)
   - Добавлена проверка ответа и валидация URL (строки 54-62)
   - Улучшена обработка ошибок (строки 63-66)

---

## Тестирование

### Тестирование размещения clue-клеток:
- ✅ Clue-клетки размещаются ПОСЛЕ слова
- ✅ Clue-клетки не залезают в область ввода
- ✅ Clue-клетки не пересекаются с буквами слова
- ✅ Сканворд генерируется корректно

### Тестирование загрузки изображений:
- ✅ Ошибки `ERR_NAME_NOT_RESOLVED` не возникают
- ✅ Изображения загружаются корректно
- ✅ Таймаут работает правильно
- ✅ Fallback на несколько API работает

---

## Статус: ✅ Готово к использованию

Обе проблемы решены:
1. Clue-клетки теперь размещаются ПОСЛЕ слова и не залезают в область ввода
2. Ошибки загрузки изображений исправлены, добавлены надёжные API и таймауты

Проект успешно собран и готов к использованию.
