import { CrosswordData } from '../types/crossword';
import { generateCrossword } from './wordGenerator';

export const crosswordApi = {
  fetchCrossword: async (id: string): Promise<CrosswordData> => {
    const targetCount = 20;
    const crossword = await generateCrossword(targetCount);
    crossword.id = id;
    return crossword;
  },

  generateNew: async (): Promise<CrosswordData> => {
    const targetCount = 20;
    const crossword = await generateCrossword(targetCount);
    crossword.id = `crossword-${Date.now()}`;
    return crossword;
  },
};
