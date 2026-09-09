import { CrosswordData } from '../types/crossword';
import { generateCrossword } from './wordGenerator';

export const crosswordApi = {
  fetchCrossword: async (id: string, wordsCount?: number): Promise<CrosswordData> => {
    const targetCount = wordsCount || (25 + Math.floor(Math.random() * 11)); // 25-35 слов по умолчанию
    const crossword = await generateCrossword(targetCount);
    crossword.id = id;
    return crossword;
  },

  generateNew: async (wordsCount?: number): Promise<CrosswordData> => {
    const targetCount = wordsCount || (25 + Math.floor(Math.random() * 11)); // 25-35 слов по умолчанию
    const crossword = await generateCrossword(targetCount);
    crossword.id = `crossword-${Date.now()}`;
    return crossword;
  },
};
