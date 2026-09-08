import { CrosswordData } from '../types/crossword';
import { generateCrossword } from './wordGenerator';

export const crosswordApi = {
  fetchCrossword: async (id: string): Promise<CrosswordData> => {
    // Генерируем новый сканворд при каждом запросе (15-20 слов)
    const targetCount = 15 + Math.floor(Math.random() * 6); // 15-20
    const crossword = await generateCrossword(targetCount);
    crossword.id = id;
    return crossword;
  },

  generateNew: async (): Promise<CrosswordData> => {
    const targetCount = 15 + Math.floor(Math.random() * 6); // 15-20
    const crossword = await generateCrossword(targetCount);
    crossword.id = `crossword-${Date.now()}`;
    return crossword;
  },
};
