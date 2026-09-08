import { Cell, CrosswordData, Word, Direction } from '../types/crossword';
import { getQuestions, Question } from './supabaseApi';

// ============================================================
// Словарь русских слов с определениями (fallback)
// ============================================================
interface WordEntry {
  word: string; // слово ВЕРХНИМ регистром
  clue: string; // определение / вопрос
}

const FALLBACK_WORD_POOL: WordEntry[] = [
  { word: 'КОШКА', clue: 'Мурлыкающее домашнее животное' },
  { word: 'СОБАКА', clue: 'Лучший друг человека' },
  { word: 'ДЕРЕВО', clue: 'Растёт в лесу, имеет ствол и крону' },
  { word: 'СОЛНЦЕ', clue: 'Звезда, дающая нам свет и тепло' },
  { word: 'КНИГА', clue: 'Источник знаний с страницами' },
  { word: 'МОЛОКО', clue: 'Белый напиток от коровы' },
  { word: 'РЕКА', clue: 'Поток воды, текущий к морю' },
  { word: 'ГОРОД', clue: 'Крупный населённый пункт' },
  { word: 'ЗИМА', clue: 'Снежное время года' },
  { word: 'ВЕСНА', clue: 'Время пробуждения природы' },
  { word: 'ОСЕНЬ', clue: 'Время листопада' },
  { word: 'ЛЕТО', clue: 'Самое тёплое время года' },
  { word: 'ОКНО', clue: 'Стеклянный проём в стене' },
  { word: 'ДВЕРЬ', clue: 'Через неё входят в комнату' },
  { word: 'СТОЛ', clue: 'Мебель для еды и работы' },
  { word: 'КЛЮЧ', clue: 'Открывает замок' },
  { word: 'ПТИЦА', clue: 'Летает, имеет крылья и перья' },
  { word: 'РЫБА', clue: 'Живёт в воде, дышит жабрами' },
  { word: 'ЛУНА', clue: 'Ночное небесное тело, спутник Земли' },
  { word: 'ЗВЕЗДА', clue: 'Мерцает на ночном небе' },
  { word: 'НЕБО', clue: 'Голубой купол над головой' },
  { word: 'ДОЖДЬ', clue: 'Вода, падающая с облаков' },
  { word: 'СНЕГ', clue: 'Белые хлопья зимой' },
  { word: 'ВЕТЕР', clue: 'Движение воздуха' },
  { word: 'ОГОНЬ', clue: 'Горит и греет' },
  { word: 'ВОДА', clue: 'Прозрачная жидкость, H₂O' },
  { word: 'КАМЕНЬ', clue: 'Твёрдый минерал' },
  { word: 'ПЕСОК', clue: 'Сыплется на пляже' },
  { word: 'ЦВЕТЫ', clue: 'Красуются на клумбе' },
  { word: 'ТРАВА', clue: 'Зелёный ковёр на лугу' },
  { word: 'ЛИСА', clue: 'Хитрая рыжая зверюга' },
  { word: 'ВОЛК', clue: 'Серый хищник, воет на луну' },
  { word: 'ЗАЯЦ', clue: 'Длинноухий трусишка' },
  { word: 'МЕДВЕДЬ', clue: 'Косолапый хозяин леса' },
  { word: 'БЕРЕЗА', clue: 'Белоствольное дерево России' },
  { word: 'СОСНА', clue: 'Вечнозелёное хвойное дерево' },
  { word: 'РОЗА', clue: 'Королева цветов с шипами' },
  { word: 'ЯБЛОКО', clue: 'Фрукт, который упал на Ньютона' },
  { word: 'ХЛЕБ', clue: 'Всему голова' },
  { word: 'САХАР', clue: 'Сладкий песок' },
  { word: 'СОЛЬ', clue: 'Белая приправа' },
  { word: 'МАСЛО', clue: 'На нём жарят' },
  { word: 'НОЧЬ', clue: 'Тёмное время суток' },
  { word: 'ДЕНЬ', clue: 'Светлое время суток' },
  { word: 'УТРО', clue: 'Начало дня' },
  { word: 'ВЕЧЕР', clue: 'Конец рабочего дня' },
  { word: 'КОТ', clue: 'Мурлыка на диване' },
  { word: 'ДОМ', clue: 'Стены и крыша, где живут' },
  { word: 'МИР', clue: 'Вся наша планета' },
  { word: 'ТОРТ', clue: 'Сладкое лакомство на праздник' },
];

// Функция для загрузки слов из Supabase
async function loadWordsFromDB(): Promise<WordEntry[]> {
  try {
    const questions = await getQuestions(50);
    if (questions.length > 0) {
      console.log(`Loaded ${questions.length} words from Supabase`);
      return questions.map((q: Question) => ({
        word: q.word.toUpperCase(),
        clue: q.clue,
      }));
    }
  } catch (error) {
    console.warn('Failed to load words from Supabase, using fallback:', error);
  }
  return FALLBACK_WORD_POOL;
}

// Глобальный кэш слов
let wordPoolCache: WordEntry[] | null = null;

// Функция для получения пула слов (с кэшированием)
async function getWordPool(): Promise<WordEntry[]> {
  if (!wordPoolCache) {
    wordPoolCache = await loadWordsFromDB();
  }
  return wordPoolCache;
}

// Функция для сброса кэша (если нужно обновить слова)
export function resetWordPoolCache() {
  wordPoolCache = null;
}

// ============================================================
// Типы для внутреннего алгоритма
// ============================================================
interface PlacedWord {
  id: string;
  word: string;
  clue: string;
  direction: 'horizontal' | 'vertical';
  startX: number;
  startY: number;
}

interface GridCell {
  letter: string | null; // буква или null
  wordIds: string[]; // ID слов, проходящих через эту клетку
}

// ============================================================
// Вспомогательные функции
// ============================================================
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getLetterAt(placed: PlacedWord, index: number): string {
  return placed.word[index];
}

function getCellCoords(placed: PlacedWord, index: number): { x: number; y: number } {
  if (placed.direction === 'horizontal') {
    return { x: placed.startX + index, y: placed.startY };
  }
  return { x: placed.startX, y: placed.startY + index };
}

function getCluePosition(placed: PlacedWord): { x: number; y: number } {
  // Clue-клетка стоит ПЕРЕД первой буквой (в обратном направлении чтения)
  if (placed.direction === 'horizontal') {
    return { x: placed.startX - 1, y: placed.startY };
  }
  return { x: placed.startX, y: placed.startY - 1 };
}

function getDirection(placed: PlacedWord): Direction {
  // Направление стрелки = направление чтения слова
  return placed.direction === 'horizontal' ? 'right' : 'down';
}

// ============================================================
// Проверка возможности размещения слова
// ============================================================
function canPlaceWord(
  entry: WordEntry,
  direction: 'horizontal' | 'vertical',
  startX: number,
  startY: number,
  grid: Map<string, GridCell>,
  placedWords: PlacedWord[],
  gridSize: number
): boolean {
  const word = entry.word;
  const len = word.length;

  // Проверяем, что все клетки слова помещаются в сетку
  for (let i = 0; i < len; i++) {
    const { x, y } = direction === 'horizontal'
      ? { x: startX + i, y: startY }
      : { x: startX, y: startY + i };
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return false;
  }

  // Проверяем clue-клетку
  const cluePos = direction === 'horizontal'
    ? { x: startX - 1, y: startY }
    : { x: startX, y: startY - 1 };
  if (cluePos.x < 0 || cluePos.x >= gridSize || cluePos.y < 0 || cluePos.y >= gridSize) return false;

  // Clue-клетка не должна быть занята буквой
  const clueKey = `${cluePos.x},${cluePos.y}`;
  const clueCell = grid.get(clueKey);
  if (clueCell && clueCell.letter !== null) return false;

  // Проверяем, что clue-клетка не занята другой clue-клеткой
  for (const pw of placedWords) {
    const existingClue = getCluePosition(pw);
    if (existingClue.x === cluePos.x && existingClue.y === cluePos.y) return false;
  }

  // Проверяем каждую клетку слова
  let hasIntersection = false;
  for (let i = 0; i < len; i++) {
    const { x, y } = direction === 'horizontal'
      ? { x: startX + i, y: startY }
      : { x: startX, y: startY + i };
    const key = `${x},${y}`;
    const cell = grid.get(key);
    const letter = word[i];

    if (cell) {
      if (cell.letter !== null) {
        // Клетка уже содержит букву — должно быть пересечение
        if (cell.letter !== letter) return false; // конфликт букв
        hasIntersection = true;
      } else {
        // Клетка существует как clue — нельзя
        return false;
      }
    }

    // Проверяем соседние клетки (не должны быть буквами, кроме как продолжение слова)
    // Это предотвращает слипание слов
    if (!cell || cell.letter === null) {
      // Проверяем перпендикулярных соседей
      if (direction === 'horizontal') {
        // Соседи сверху и снизу не должны быть буквами
        const above = grid.get(`${x},${y - 1}`);
        const below = grid.get(`${x},${y + 1}`);
        if (above && above.letter !== null) return false;
        if (below && below.letter !== null) return false;
      } else {
        // Соседи слева и справа не должны быть буквами
        const left = grid.get(`${x - 1},${y}`);
        const right = grid.get(`${x + 1},${y}`);
        if (left && left.letter !== null) return false;
        if (right && right.letter !== null) return false;
      }
    }
  }

  // Проверяем клетки ДО и ПОСЛЕ слова (не должны быть буквами)
  if (direction === 'horizontal') {
    const before = grid.get(`${startX - 1},${startY}`);
    const after = grid.get(`${startX + len},${startY}`);
    if (before && before.letter !== null) return false;
    if (after && after.letter !== null) return false;
  } else {
    const before = grid.get(`${startX},${startY - 1}`);
    const after = grid.get(`${startX},${startY + len}`);
    if (before && before.letter !== null) return false;
    if (after && after.letter !== null) return false;
  }

  // Должно быть хотя бы одно пересечение (кроме первого слова)
  if (placedWords.length > 0 && !hasIntersection) return false;

  return true;
}

// ============================================================
// Найти все возможные позиции для слова
// ============================================================
function findPossiblePlacements(
  entry: WordEntry,
  grid: Map<string, GridCell>,
  placedWords: PlacedWord[],
  gridSize: number
): { direction: 'horizontal' | 'vertical'; startX: number; startY: number; intersections: number }[] {
  const placements: { direction: 'horizontal' | 'vertical'; startX: number; startY: number; intersections: number }[] = [];

  for (const placed of placedWords) {
    for (let pi = 0; pi < placed.word.length; pi++) {
      for (let ei = 0; ei < entry.word.length; ei++) {
        if (placed.word[pi] === entry.word[ei]) {
          // Попробуем горизонтальное размещение
          const hStartX = placed.direction === 'horizontal'
            ? placed.startX + pi - ei
            : placed.startX - ei;
          const hStartY = placed.direction === 'horizontal'
            ? placed.startY
            : placed.startY + pi - ei;

          if (canPlaceWord(entry, 'horizontal', hStartX, hStartY, grid, placedWords, gridSize)) {
            // Считаем количество пересечений
            let intersections = 0;
            for (let i = 0; i < entry.word.length; i++) {
              const { x, y } = { x: hStartX + i, y: hStartY };
              const cell = grid.get(`${x},${y}`);
              if (cell && cell.letter !== null) intersections++;
            }
            placements.push({ direction: 'horizontal', startX: hStartX, startY: hStartY, intersections });
          }

          // Попробуем вертикальное размещение
          const vStartX = placed.direction === 'vertical'
            ? placed.startX
            : placed.startX + pi - ei;
          const vStartY = placed.direction === 'vertical'
            ? placed.startY + pi - ei
            : placed.startY;

          if (canPlaceWord(entry, 'vertical', vStartX, vStartY, grid, placedWords, gridSize)) {
            let intersections = 0;
            for (let i = 0; i < entry.word.length; i++) {
              const { x, y } = { x: vStartX, y: vStartY + i };
              const cell = grid.get(`${x},${y}`);
              if (cell && cell.letter !== null) intersections++;
            }
            placements.push({ direction: 'vertical', startX: vStartX, startY: vStartY, intersections });
          }
        }
      }
    }
  }

  return placements;
}

// ============================================================
// Основной генератор
// ============================================================
export async function generateCrossword(targetWordCount: number = 10): Promise<CrosswordData> {
  const gridSize = 20; // Достаточно большая сетка для размещения
  const maxAttempts = 50;

  // Загружаем слова из базы данных
  const WORD_POOL = await getWordPool();

  let bestResult: {
    placedWords: PlacedWord[];
    grid: Map<string, GridCell>;
  } | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = new Map<string, GridCell>();
    const placedWords: PlacedWord[] = [];
    const pool = shuffleArray(WORD_POOL);

    // Первое слово — самое длинное, горизонтально, в центре сетки
    const sorted = [...pool].sort((a: WordEntry, b: WordEntry) => b.word.length - a.word.length);
    const firstWord = sorted[0] as WordEntry;
    const center = Math.floor(gridSize / 2);
    const startX = center - Math.floor(firstWord.word.length / 2);
    const startY = center;

    // Размещаем первое слово
    placeWordInGrid(firstWord, 'horizontal', startX, startY, grid, `w${placedWords.length + 1}`);
    placedWords.push({
      id: `w${placedWords.length + 1}`,
      word: firstWord.word,
      clue: firstWord.clue,
      direction: 'horizontal',
      startX,
      startY,
    });

    // Пытаемся разместить остальные слова
    const remaining = sorted.slice(1);
    const shuffledRemaining = shuffleArray(remaining);

    for (const entry of shuffledRemaining) {
      if (placedWords.length >= targetWordCount) break;

      const placements = findPossiblePlacements(entry as WordEntry, grid, placedWords, gridSize);
      if (placements.length === 0) continue;

      // Выбираем размещение с наибольшим количеством пересечений, ближе к центру
      placements.sort((a, b) => {
        const distA = Math.abs(a.startX - center) + Math.abs(a.startY - center);
        const distB = Math.abs(b.startX - center) + Math.abs(b.startY - center);
        if (b.intersections !== a.intersections) return b.intersections - a.intersections;
        return distA - distB;
      });

      const best = placements[0];
      const wordId = `w${placedWords.length + 1}`;
      placeWordInGrid(entry as WordEntry, best.direction, best.startX, best.startY, grid, wordId);
      placedWords.push({
        id: wordId,
        word: (entry as WordEntry).word,
        clue: (entry as WordEntry).clue,
        direction: best.direction,
        startX: best.startX,
        startY: best.startY,
      });
    }

    if (!bestResult || placedWords.length > bestResult.placedWords.length) {
      bestResult = { placedWords: [...placedWords], grid: new Map(grid) };
    }

    if (placedWords.length >= targetWordCount) break;
  }

  if (!bestResult) {
    // Fallback — пустой кроссворд
    return {
      id: 'crossword-generated',
      title: 'Сканворд',
      width: 1,
      height: 1,
      cells: [],
      words: [],
    };
  }

  return buildCrosswordData(bestResult.placedWords, bestResult.grid, gridSize);
}

function placeWordInGrid(
  entry: WordEntry,
  direction: 'horizontal' | 'vertical',
  startX: number,
  startY: number,
  grid: Map<string, GridCell>,
  wordId: string
): void {
  for (let i = 0; i < entry.word.length; i++) {
    const { x, y } = direction === 'horizontal'
      ? { x: startX + i, y: startY }
      : { x: startX, y: startY + i };
    const key = `${x},${y}`;
    const existing = grid.get(key);
    if (existing) {
      existing.wordIds.push(wordId);
    } else {
      grid.set(key, { letter: entry.word[i], wordIds: [wordId] });
    }
  }
}

// ============================================================
// Построение финальных данных CrosswordData
// ============================================================
function buildCrosswordData(
  placedWords: PlacedWord[],
  grid: Map<string, GridCell>,
  fullGridSize: number
): CrosswordData {
  // Находим границы сетки
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  for (const pw of placedWords) {
    for (let i = 0; i < pw.word.length; i++) {
      const { x, y } = getCellCoords(pw, i);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    // Учитываем clue-клетку
    const clue = getCluePosition(pw);
    minX = Math.min(minX, clue.x);
    maxX = Math.max(maxX, clue.x);
    minY = Math.min(minY, clue.y);
    maxY = Math.max(maxY, clue.y);
  }

  // Смещаем всё так, чтобы начиналось с (0, 0)
  const offsetX = minX;
  const offsetY = minY;
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // Нормализуем координаты размещённых слов
  const normalizedWords = placedWords.map(pw => ({
    ...pw,
    startX: pw.startX - offsetX,
    startY: pw.startY - offsetY,
  }));

  // Строим сетку клеток
  const cells: Cell[] = [];
  const cellMap = new Map<string, Cell>();

  // Сначала заполняем все клетки как чёрные
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell: Cell = {
        id: `c${x}-${y}`,
        x,
        y,
        type: 'black',
        userInput: '',
      };
      cells.push(cell);
      cellMap.set(`${x},${y}`, cell);
    }
  }

  // Заполняем буквы слов
  for (const pw of normalizedWords) {
    for (let i = 0; i < pw.word.length; i++) {
      const { x, y } = pw.direction === 'horizontal'
        ? { x: pw.startX + i, y: pw.startY }
        : { x: pw.startX, y: pw.startY + i };
      const cell = cellMap.get(`${x},${y}`);
      if (cell && cell.type === 'black') {
        cell.type = 'empty';
        cell.answerLetter = pw.word[i];
      }
    }
  }

  // Заполняем clue-клетки
  for (const pw of normalizedWords) {
    const cluePos = pw.direction === 'horizontal'
      ? { x: pw.startX - 1, y: pw.startY }
      : { x: pw.startX, y: pw.startY - 1 };
    const cell = cellMap.get(`${cluePos.x},${cluePos.y}`);
    if (cell) {
      cell.type = 'clue';
      cell.clueText = pw.clue;
      cell.direction = getDirection({ ...pw, direction: pw.direction } as PlacedWord);
      cell.targetWordId = pw.id;
    }
  }

  // Строим массив слов
  const words: Word[] = normalizedWords.map(pw => {
    const wordCells: string[] = [];
    for (let i = 0; i < pw.word.length; i++) {
      const { x, y } = pw.direction === 'horizontal'
        ? { x: pw.startX + i, y: pw.startY }
        : { x: pw.startX, y: pw.startY + i };
      wordCells.push(`c${x}-${y}`);
    }
    return {
      id: pw.id,
      cells: wordCells,
      clueText: pw.clue,
      isSolved: false,
    };
  });

  return {
    id: 'crossword-generated',
    title: 'Сканворд',
    width,
    height,
    cells,
    words,
  };
}
