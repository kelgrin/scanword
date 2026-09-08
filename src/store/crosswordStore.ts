import { create } from 'zustand';
import { Cell, CrosswordData, Word } from '../types/crossword';

interface CrosswordState {
  crossword: CrosswordData | null;
  cells: Cell[];
  words: Word[];
  activeCellId: string | null;
  activeWordId: string | null;

  // Actions
  loadCrossword: (data: CrosswordData) => void;
  reset: () => void;
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
  getSolvedCount: () => number;
  getNextCellInWord: (cellId: string, wordId: string) => string | null;
  getPrevCellInWord: (cellId: string, wordId: string) => string | null;
}

export const useCrosswordStore = create<CrosswordState>((set, get) => ({
  crossword: null,
  cells: [],
  words: [],
  activeCellId: null,
  activeWordId: null,

  loadCrossword: (data: CrosswordData) => {
    set({
      crossword: data,
      cells: data.cells,
      words: data.words,
      activeCellId: null,
      activeWordId: null,
    });
  },

  reset: () => {
    set({
      crossword: null,
      cells: [],
      words: [],
      activeCellId: null,
      activeWordId: null,
    });
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
      if (word.isSolved) return word; // already solved

      const wordCells = word.cells.map((cid) => state.cells.find((c) => c.id === cid));
      const allFilled = wordCells.every((c) => c && c.userInput !== '');
      const allCorrect = wordCells.every((c) => c && c.userInput === c.answerLetter);

      if (allFilled && allCorrect) {
        return { ...word, isSolved: true };
      }
      return word;
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
    return state.words.some((w) => w.isSolved && w.cells.includes(cellId));
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

  getSolvedCount: () => {
    const state = get();
    return state.words.filter((w) => w.isSolved).length;
  },

  getNextCellInWord: (cellId: string, wordId: string) => {
    const state = get();
    const word = state.words.find((w) => w.id === wordId);
    if (!word) return null;
    const idx = word.cells.indexOf(cellId);
    if (idx === -1 || idx >= word.cells.length - 1) return null;
    return word.cells[idx + 1];
  },

  getPrevCellInWord: (cellId: string, wordId: string) => {
    const state = get();
    const word = state.words.find((w) => w.id === wordId);
    if (!word) return null;
    const idx = word.cells.indexOf(cellId);
    if (idx <= 0) return null;
    return word.cells[idx - 1];
  },
}));
