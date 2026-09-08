import { CrosswordData } from '../types/crossword';

/**
 * Сканворд 7x7
 * 
 * Layout:
 * Col:  0       1       2    3    4    5       6
 * R0:   #    [КОТ→]    К    О    Т   [ВОДА↓]  #
 * R1:  [НОЧЬ↓]  #      #    #    #    О       #
 * R2:   Н       #      #    #    #    Д       #
 * R3:   О       #      #    #    #    А       #
 * R4:   Ч       #      #    #    #    #       #
 * R5:   Ь    [ЗИМА→]   З    И    М    А       #
 * R6:   #       #      #    #    #    #       #
 * 
 * Words:
 * 1. КОТ (right): clue c1-0 → c2-0(К), c3-0(О), c4-0(Т)
 * 2. НОЧЬ (down): clue c0-1 → c0-2(Н), c0-3(О), c0-4(Ч), c0-5(Ь)
 * 3. ВОДА (down): clue c5-0 → c5-1(В), c5-2(О), c5-3(Д), c5-4(А)
 * 4. ЗИМА (right): clue c1-5 → c2-5(З), c3-5(И), c4-5(М), c5-5(А)
 */

const mockCrossword: CrosswordData = {
  id: 'crossword-1',
  title: 'Сканворд #1',
  width: 7,
  height: 7,
  words: [
    { id: 'w1', cells: ['c2-0', 'c3-0', 'c4-0'], clueText: 'Домашнее животное, любит молоко', isSolved: false },
    { id: 'w2', cells: ['c0-2', 'c0-3', 'c0-4', 'c0-5'], clueText: 'Время суток, когда темно', isSolved: false },
    { id: 'w3', cells: ['c5-1', 'c5-2', 'c5-3', 'c5-4'], clueText: 'Жидкость, без которой нельзя жить', isSolved: false },
    { id: 'w4', cells: ['c2-5', 'c3-5', 'c4-5', 'c5-5'], clueText: 'Холодное время года', isSolved: false },
  ],
  cells: [
    // Row 0
    { id: 'c0-0', x: 0, y: 0, type: 'black', userInput: '' },
    { id: 'c1-0', x: 1, y: 0, type: 'clue', clueText: 'Домашнее животное, любит молоко', direction: 'right', targetWordId: 'w1', userInput: '' },
    { id: 'c2-0', x: 2, y: 0, type: 'empty', answerLetter: 'К', userInput: '' },
    { id: 'c3-0', x: 3, y: 0, type: 'empty', answerLetter: 'О', userInput: '' },
    { id: 'c4-0', x: 4, y: 0, type: 'empty', answerLetter: 'Т', userInput: '' },
    { id: 'c5-0', x: 5, y: 0, type: 'clue', clueText: 'Жидкость, без которой нельзя жить', direction: 'down', targetWordId: 'w3', userInput: '' },
    { id: 'c6-0', x: 6, y: 0, type: 'black', userInput: '' },

    // Row 1
    { id: 'c0-1', x: 0, y: 1, type: 'clue', clueText: 'Время суток, когда темно', direction: 'down', targetWordId: 'w2', userInput: '' },
    { id: 'c1-1', x: 1, y: 1, type: 'black', userInput: '' },
    { id: 'c2-1', x: 2, y: 1, type: 'black', userInput: '' },
    { id: 'c3-1', x: 3, y: 1, type: 'black', userInput: '' },
    { id: 'c4-1', x: 4, y: 1, type: 'black', userInput: '' },
    { id: 'c5-1', x: 5, y: 1, type: 'empty', answerLetter: 'В', userInput: '' },
    { id: 'c6-1', x: 6, y: 1, type: 'black', userInput: '' },

    // Row 2
    { id: 'c0-2', x: 0, y: 2, type: 'empty', answerLetter: 'Н', userInput: '' },
    { id: 'c1-2', x: 1, y: 2, type: 'black', userInput: '' },
    { id: 'c2-2', x: 2, y: 2, type: 'black', userInput: '' },
    { id: 'c3-2', x: 3, y: 2, type: 'black', userInput: '' },
    { id: 'c4-2', x: 4, y: 2, type: 'black', userInput: '' },
    { id: 'c5-2', x: 5, y: 2, type: 'empty', answerLetter: 'О', userInput: '' },
    { id: 'c6-2', x: 6, y: 2, type: 'black', userInput: '' },

    // Row 3
    { id: 'c0-3', x: 0, y: 3, type: 'empty', answerLetter: 'О', userInput: '' },
    { id: 'c1-3', x: 1, y: 3, type: 'black', userInput: '' },
    { id: 'c2-3', x: 2, y: 3, type: 'black', userInput: '' },
    { id: 'c3-3', x: 3, y: 3, type: 'black', userInput: '' },
    { id: 'c4-3', x: 4, y: 3, type: 'black', userInput: '' },
    { id: 'c5-3', x: 5, y: 3, type: 'empty', answerLetter: 'Д', userInput: '' },
    { id: 'c6-3', x: 6, y: 3, type: 'black', userInput: '' },

    // Row 4
    { id: 'c0-4', x: 0, y: 4, type: 'empty', answerLetter: 'Ч', userInput: '' },
    { id: 'c1-4', x: 1, y: 4, type: 'black', userInput: '' },
    { id: 'c2-4', x: 2, y: 4, type: 'black', userInput: '' },
    { id: 'c3-4', x: 3, y: 4, type: 'black', userInput: '' },
    { id: 'c4-4', x: 4, y: 4, type: 'black', userInput: '' },
    { id: 'c5-4', x: 5, y: 4, type: 'empty', answerLetter: 'А', userInput: '' },
    { id: 'c6-4', x: 6, y: 4, type: 'black', userInput: '' },

    // Row 5
    { id: 'c0-5', x: 0, y: 5, type: 'empty', answerLetter: 'Ь', userInput: '' },
    { id: 'c1-5', x: 1, y: 5, type: 'clue', clueText: 'Холодное время года', direction: 'right', targetWordId: 'w4', userInput: '' },
    { id: 'c2-5', x: 2, y: 5, type: 'empty', answerLetter: 'З', userInput: '' },
    { id: 'c3-5', x: 3, y: 5, type: 'empty', answerLetter: 'И', userInput: '' },
    { id: 'c4-5', x: 4, y: 5, type: 'empty', answerLetter: 'М', userInput: '' },
    { id: 'c5-5', x: 5, y: 5, type: 'empty', answerLetter: 'А', userInput: '' },
    { id: 'c6-5', x: 6, y: 5, type: 'black', userInput: '' },

    // Row 6
    { id: 'c0-6', x: 0, y: 6, type: 'black', userInput: '' },
    { id: 'c1-6', x: 1, y: 6, type: 'black', userInput: '' },
    { id: 'c2-6', x: 2, y: 6, type: 'black', userInput: '' },
    { id: 'c3-6', x: 3, y: 6, type: 'black', userInput: '' },
    { id: 'c4-6', x: 4, y: 6, type: 'black', userInput: '' },
    { id: 'c5-6', x: 5, y: 6, type: 'black', userInput: '' },
    { id: 'c6-6', x: 6, y: 6, type: 'black', userInput: '' },
  ],
};

export const crosswordApi = {
  fetchCrossword: (id: string): Promise<CrosswordData> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ ...mockCrossword, id });
      }, 300);
    });
  },
};
