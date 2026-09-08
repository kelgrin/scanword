import { CrosswordData } from '../types/crossword';
import { generateCrossword } from './wordGenerator';

export const crosswordApi = {
  fetchCrossword: async (id: string): Promise<CrosswordData> => {
    // Генерируем новый сканворд при каждом запросе
    const crossword = await generateCrossword(10);
    crossword.id = id;
    return crossword;
  },

  generateNew: async (): Promise<CrosswordData> => {
    const crossword = await generateCrossword(10);
    crossword.id = `crossword-${Date.now()}`;
    return crossword;
  },
};
