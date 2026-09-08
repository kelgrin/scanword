import { CrosswordData } from '../types/crossword';
import { generateCrossword } from './wordGenerator';

export const crosswordApi = {
  fetchCrossword: (id: string): Promise<CrosswordData> => {
    return new Promise((resolve) => {
      // Генерируем новый сканворд при каждом запросе
      setTimeout(() => {
        const crossword = generateCrossword(10);
        crossword.id = id;
        resolve(crossword);
      }, 200);
    });
  },

  generateNew: (): Promise<CrosswordData> => {
    return new Promise((resolve) => {
      const crossword = generateCrossword(10);
      crossword.id = `crossword-${Date.now()}`;
      resolve(crossword);
    });
  },
};
