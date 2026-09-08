import { create } from 'zustand';
import { Cell, CrosswordData, Word } from '../types/crossword';
import { crosswordApi } from '../services/crosswordApi';

interface CrosswordState {
  crossword: CrosswordData | null;
  cells: Cell[];
  words: Word[];
  activeCellId: string | null;
  activeWordId: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadCrossword: (id: string) => Promise<void>;
  setActiveCell: (cellId: string | null) => void;
  setActiveWord: (wordId: string | null) => void;
  setInput: (cellId: string, value: string) => void;
  clearInput: (cellId: string) => void;
  checkWords: () => void;
  getWordCells: (wordId: string) => Cell[];
  getActiveWordCells: () => Cell[];
  isCellInActiveWord: (cellId: string) => boolean;
  isCellSolved: (cellId: string) => boolean;
  getClueForCell: (cellId: string) => { clueText: string; wordId: string } | null;
  getProgress: () => { solved: number; total: number };
}

export const useCrosswordStore = create<CrosswordState>((set, get) => ({
  crossword: null,
  cells: [],
  words: [],
  activeCellId: null,
  activeWordId: null,
  loading: false,
  error: null,

  loadCrossword: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const data = await crosswordApi.fetchCrossword(id);
      set({
        crossword: data,
        cells: data.cells,
        words: data.words,
        loading: false,
      });
    } catch {
      set({ error: 'Ошибка загрузки сканворда', loading: false });
    }
  },

  setActiveCell: (cellId: string | null) => {
    const state = get();
    if (!cellId) {
      set({ activeCellId: null, activeWordId: null });
      return;
    }

    const cell = state.cells.find((c) => c.id === cellId);
    if (!cell) return;

    // Find which word this cell belongs to
    const word = state.words.find((w) => w.cells.includes(cellId));
    
    set({
      activeCellId: cellId,
      activeWordId: word ? word.id : state.activeWordId,
    });
  },

  setActiveWord: (wordId: string | null) => {
    set({ activeWordId: wordId });
  },

  setInput: (cellId: string, value: string) => {
    set((state) => ({
      cells: state.cells.map((cell) =>
        cell.id === cellId ? { ...cell, userInput: value.toUpperCase().slice(-1) } : cell
      ),
    }));
    // Check words after input
    setTimeout(() => get().checkWords(), 0);
  },

  clearInput: (cellId: string) => {
    set((state) => ({
      cells: state.cells.map((cell) =>
        cell.id === cellId ? { ...cell, userInput: '' } : cell
      ),
    }));
  },

  checkWords: () => {
    const state = get();
    const updatedWords = state.words.map((word) => {
      const wordCells = word.cells.map((cid) => state.cells.find((c) => c.id === cid));
      const allFilled = wordCells.every((c) => c && c.userInput !== '');
      const allCorrect = wordCells.every((c) => c && c.userInput === c.answerLetter);
      
      return {
        ...word,
        isSolved: allFilled && allCorrect,
      };
    });

    set({ words: updatedWords });
  },

  getWordCells: (wordId: string) => {
    const state = get();
    const word = state.words.find((w) => w.id === wordId);
    if (!word) return [];
    return word.cells.map((cid) => state.cells.find((c) => c.id === cid)!).filter(Boolean);
  },

  getActiveWordCells: () => {
    const state = get();
    if (!state.activeWordId) return [];
    return get().getWordCells(state.activeWordId);
  },

  isCellInActiveWord: (cellId: string) => {
    const state = get();
    if (!state.activeWordId) return false;
    const word = state.words.find((w) => w.id === state.activeWordId);
    return word ? word.cells.includes(cellId) : false;
  },

  isCellSolved: (cellId: string) => {
    const state = get();
    const word = state.words.find((w) => w.cells.includes(cellId));
    return word ? word.isSolved : false;
  },

  getClueForCell: (cellId: string) => {
    const state = get();
    const word = state.words.find((w) => w.cells.includes(cellId));
    if (!word) return null;
    return { clueText: word.clueText, wordId: word.id };
  },

  getProgress: () => {
    const state = get();
    const total = state.words.length;
    const solved = state.words.filter((w) => w.isSolved).length;
    return { solved, total };
  },
}));
