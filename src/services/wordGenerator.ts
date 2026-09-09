import { Cell, CrosswordData, Word, Direction } from '../types/crossword';
import { getQuestions, Question } from './supabaseApi';

// ============================================================
// Словарь русских слов с определениями (fallback)
// ============================================================
interface WordEntry {
  word: string;
  clue: string;
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
    const questions = await getQuestions(80);
    if (questions.length > 0) {
      console.log(`Loaded ${questions.length} words from Supabase`);
      return questions.map((q: Question) => ({
        word: q.answer.toUpperCase(),
        clue: q.question,
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
type WordDirection = 'horizontal' | 'vertical';
type ClueDirection = 'left' | 'right' | 'up' | 'down' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

interface PlacedWord {
  id: string;
  word: string;
  clue: string;
  direction: WordDirection;
  clueDirection: ClueDirection; // Направление стрелки от clue-клетки к слову
  startX: number;
  startY: number;
  clueWidth: number; // 1 или 2 клетки
}

interface GridCell {
  letter: string | null;
  wordIds: string[];
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

function getWordDirectionVector(direction: WordDirection): { dx: number; dy: number } {
  switch (direction) {
    case 'horizontal': return { dx: 1, dy: 0 };
    case 'vertical': return { dx: 0, dy: 1 };
  }
}

function getClueDirectionVector(direction: ClueDirection): { dx: number; dy: number } {
  // Вектор от clue-клетки к первой букве слова
  switch (direction) {
    case 'right': return { dx: 1, dy: 0 };
    case 'left': return { dx: -1, dy: 0 };
    case 'down': return { dx: 0, dy: 1 };
    case 'up': return { dx: 0, dy: -1 };
    case 'down-right': return { dx: 1, dy: 1 };
    case 'down-left': return { dx: -1, dy: 1 };
    case 'up-right': return { dx: 1, dy: -1 };
    case 'up-left': return { dx: -1, dy: -1 };
  }
}

function getCluePosition(placed: PlacedWord): { x: number; y: number }[] {
  const clueVector = getClueDirectionVector(placed.clueDirection);
  // Clue-клетка(и) стоят ПЕРЕД первой буквой (в обратном направлении от стрелки)
  const positions = [];
  for (let i = 0; i < placed.clueWidth; i++) {
    positions.push({
      x: placed.startX - clueVector.dx * (i + 1),
      y: placed.startY - clueVector.dy * (i + 1),
    });
  }
  return positions;
}

// ============================================================
// Проверка возможности размещения слова
// ============================================================
function canPlaceWord(
  entry: WordEntry,
  direction: WordDirection,
  clueDirection: ClueDirection,
  startX: number,
  startY: number,
  clueWidth: number,
  grid: Map<string, GridCell>,
  placedWords: PlacedWord[],
  gridSize: number
): boolean {
  const word = entry.word;
  const len = word.length;
  const vector = getWordDirectionVector(direction);

  // Проверяем, что все клетки слова помещаются в сетку
  for (let i = 0; i < len; i++) {
    const x = startX + vector.dx * i;
    const y = startY + vector.dy * i;
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return false;
  }

  // Проверяем clue-клетки (используем clueDirection)
  const clueVector = getClueDirectionVector(clueDirection);
  const cluePositions = [];
  for (let i = 0; i < clueWidth; i++) {
    const cx = startX - clueVector.dx * (i + 1);
    const cy = startY - clueVector.dy * (i + 1);
    if (cx < 0 || cx >= gridSize || cy < 0 || cy >= gridSize) return false;
    cluePositions.push({ x: cx, y: cy });
  }

  // Clue-клетки не должны быть заняты буквами
  for (const pos of cluePositions) {
    const clueKey = `${pos.x},${pos.y}`;
    const clueCell = grid.get(clueKey);
    if (clueCell && clueCell.letter !== null) return false;
  }

  // Проверяем, что clue-клетки не заняты другими clue-клетками
  for (const pw of placedWords) {
    const existingClues = getCluePosition(pw);
    for (const existingClue of existingClues) {
      for (const newClue of cluePositions) {
        if (existingClue.x === newClue.x && existingClue.y === newClue.y) return false;
      }
    }
  }

  // Проверяем, что clue-клетки не находятся в клетках, которые являются буквами других слов
  for (const pw of placedWords) {
    const pwVector = getWordDirectionVector(pw.direction);
    for (let i = 0; i < pw.word.length; i++) {
      const x = pw.startX + pwVector.dx * i;
      const y = pw.startY + pwVector.dy * i;
      for (const cluePos of cluePositions) {
        if (x === cluePos.x && y === cluePos.y) {
          return false;
        }
      }
    }
  }

  // Проверяем каждую клетку слова
  let hasIntersection = false;
  for (let i = 0; i < len; i++) {
    const x = startX + vector.dx * i;
    const y = startY + vector.dy * i;
    const key = `${x},${y}`;
    const cell = grid.get(key);
    const letter = word[i];

    if (cell) {
      if (cell.letter !== null) {
        // Клетка уже содержит букву — должно быть пересечение
        if (cell.letter !== letter) return false;
        hasIntersection = true;
      } else {
        return false;
      }
    }

    // Проверяем соседние клетки (не должны быть буквами, кроме как продолжение слова)
    if (!cell || cell.letter === null) {
      // Проверяем всех 8 соседей
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          
          // Пропускаем соседей вдоль направления слова
          const isAlongWord = (dx === vector.dx && dy === vector.dy) || 
                             (dx === -vector.dx && dy === -vector.dy);
          if (isAlongWord) continue;
          
          const neighbor = grid.get(`${x + dx},${y + dy}`);
          if (neighbor && neighbor.letter !== null) {
            return false;
          }
        }
      }
    }
  }

  // Проверяем клетки ДО и ПОСЛЕ слова (не должны быть буквами)
  const beforeX = startX - vector.dx;
  const beforeY = startY - vector.dy;
  const afterX = startX + vector.dx * len;
  const afterY = startY + vector.dy * len;
  
  const before = grid.get(`${beforeX},${beforeY}`);
  const after = grid.get(`${afterX},${afterY}`);
  
  if (before && before.letter !== null) return false;
  if (after && after.letter !== null) return false;

  // Требуем обязательного пересечения для всех слов кроме первого
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
): { direction: WordDirection; clueDirection: ClueDirection; startX: number; startY: number; clueWidth: number; intersections: number }[] {
  const placements: { direction: WordDirection; clueDirection: ClueDirection; startX: number; startY: number; clueWidth: number; intersections: number }[] = [];
  const wordDirections: WordDirection[] = ['horizontal', 'vertical'];
  const clueDirections: ClueDirection[] = ['left', 'right', 'up', 'down', 'up-left', 'up-right', 'down-left', 'down-right'];

  // Ищем позиции с пересечениями (по общим буквам)
  for (const placed of placedWords) {
    const placedVector = getWordDirectionVector(placed.direction);
    
    for (let pi = 0; pi < placed.word.length; pi++) {
      for (let ei = 0; ei < entry.word.length; ei++) {
        if (placed.word[pi] === entry.word[ei]) {
          // Пробуем все направления слова (только horizontal и vertical)
          for (const direction of wordDirections) {
            const vector = getWordDirectionVector(direction);
            
            // Пробуем все направления clue (8 направлений)
            for (const clueDirection of clueDirections) {
              // Пробуем clueWidth 1 и 2
              for (const clueWidth of [1, 2]) {
                const startX = placed.startX + placedVector.dx * pi - vector.dx * ei;
                const startY = placed.startY + placedVector.dy * pi - vector.dy * ei;

                if (canPlaceWord(entry, direction, clueDirection, startX, startY, clueWidth, grid, placedWords, gridSize)) {
                  // Считаем количество пересечений
                  let intersections = 0;
                  for (let i = 0; i < entry.word.length; i++) {
                    const x = startX + vector.dx * i;
                    const y = startY + vector.dy * i;
                    const cell = grid.get(`${x},${y}`);
                    if (cell && cell.letter !== null) intersections++;
                  }
                  placements.push({ direction, clueDirection, startX, startY, clueWidth, intersections });
                }
              }
            }
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
export async function generateCrossword(targetWordCount: number = 25): Promise<CrosswordData> {
  const gridSize = 35;
  const maxAttempts = 200;

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

    placeWordInGrid(firstWord, 'horizontal', startX, startY, 1, grid, `w${placedWords.length + 1}`);
    placedWords.push({
      id: `w${placedWords.length + 1}`,
      word: firstWord.word,
      clue: firstWord.clue,
      direction: 'horizontal',
      clueDirection: 'left', // Стрелка слева
      startX,
      startY,
      clueWidth: 1,
    });

    // Пытаемся разместить остальные слова
    const remaining = sorted.slice(1);
    const longWords = remaining.filter((w: WordEntry) => w.word.length >= 5);
    const shortWords = remaining.filter((w: WordEntry) => w.word.length < 5);
    const orderedWords = [...shuffleArray(longWords), ...shuffleArray(shortWords)];

    for (const entry of orderedWords) {
      if (placedWords.length >= targetWordCount) break;

      const placements = findPossiblePlacements(entry as WordEntry, grid, placedWords, gridSize);
      if (placements.length === 0) continue;

      // Выбираем размещение с наибольшим количеством пересечений, ближе к центру
      placements.sort((a, b) => {
        const distA = Math.abs(a.startX - center) + Math.abs(a.startY - center);
        const distB = Math.abs(b.startX - center) + Math.abs(b.startY - center);
        const wordLength = entry.word.length;
        const intersectionWeight = wordLength >= 6 ? 3 : wordLength >= 4 ? 2 : 1;
        const scoreA = a.intersections * intersectionWeight - distA * 0.1;
        const scoreB = b.intersections * intersectionWeight - distB * 0.1;
        return scoreB - scoreA;
      });

      const best = placements[0];
      const wordId = `w${placedWords.length + 1}`;
      placeWordInGrid(entry as WordEntry, best.direction, best.startX, best.startY, best.clueWidth, grid, wordId);
      placedWords.push({
        id: wordId,
        word: (entry as WordEntry).word,
        clue: (entry as WordEntry).clue,
        direction: best.direction,
        clueDirection: best.clueDirection,
        startX: best.startX,
        startY: best.startY,
        clueWidth: best.clueWidth,
      });
    }

    if (!bestResult || placedWords.length > bestResult.placedWords.length) {
      bestResult = { placedWords: [...placedWords], grid: new Map(grid) };
    }

    if (placedWords.length >= targetWordCount) break;
  }

  if (!bestResult) {
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
  direction: WordDirection,
  startX: number,
  startY: number,
  clueWidth: number,
  grid: Map<string, GridCell>,
  wordId: string
): void {
  const vector = getWordDirectionVector(direction);
  
  for (let i = 0; i < entry.word.length; i++) {
    const x = startX + vector.dx * i;
    const y = startY + vector.dy * i;
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
    const vector = getWordDirectionVector(pw.direction);
    
    for (let i = 0; i < pw.word.length; i++) {
      const x = pw.startX + vector.dx * i;
      const y = pw.startY + vector.dy * i;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    // Учитываем clue-клетки
    const clues = getCluePosition(pw);
    for (const clue of clues) {
      minX = Math.min(minX, clue.x);
      maxX = Math.max(maxX, clue.x);
      minY = Math.min(minY, clue.y);
      maxY = Math.max(maxY, clue.y);
    }
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
    const vector = getWordDirectionVector(pw.direction);
    
    for (let i = 0; i < pw.word.length; i++) {
      const x = pw.startX + vector.dx * i;
      const y = pw.startY + vector.dy * i;
      const cell = cellMap.get(`${x},${y}`);
      if (cell && cell.type === 'black') {
        cell.type = 'empty';
        cell.answerLetter = pw.word[i];
      }
    }
  }

  // Заполняем clue-клетки
  for (const pw of normalizedWords) {
    const clues = getCluePosition(pw);
    const arrowDirection = pw.clueDirection as Direction;
    
    for (let i = 0; i < clues.length; i++) {
      const cluePos = clues[i];
      const cell = cellMap.get(`${cluePos.x},${cluePos.y}`);
      if (cell) {
        cell.type = 'clue';
        cell.clueText = pw.clue;
        cell.direction = arrowDirection;
        cell.targetWordId = pw.id;
      }
    }
  }

  // Строим массив слов
  const words: Word[] = normalizedWords.map(pw => {
    const wordCells: string[] = [];
    const vector = getWordDirectionVector(pw.direction);
    
    for (let i = 0; i < pw.word.length; i++) {
      const x = pw.startX + vector.dx * i;
      const y = pw.startY + vector.dy * i;
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
