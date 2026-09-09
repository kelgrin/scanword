import { create } from 'zustand';
import { Cell, CrosswordData, Word } from '../types/crossword';

interface CrosswordState {
  crossword: CrosswordData | null;
  cells: Cell[];
  words: Word[];
  activeCellId: string | null;
  activeWordId: string | null;
  hints: number;
  hintCells: Set<string>;

  loadCrossword: (data: CrosswordData) => void;
  reset: () => void;
  setActiveCell: (cellId: string | null, wordId?: string) => void;
  setActiveWord: (wordId: string | null) => void;
  setInput: (cellId: string, value: string, playerColor?: string, playerId?: string) => void;
  clearInput: (cellId: string) => void;
  checkWords: () => void;
  getWordCells: (wordId: string) => Cell[];
  getActiveWordCells: () => Cell[];
  isCellInActiveWord: (cellId: string) => boolean;
  isCellSolved: (cellId: string) => boolean;
  getClueForCell: (cellId: string) => { clueText: string; wordId: string } | null;
  getSolvedWordForCell: (cellId: string) => { clueText: string; wordId: string; wordText: string } | null;
  getProgress: () => { solved: number; total: number };
  getSolvedCount: () => number;
  getNextCellInWord: (cellId: string, wordId: string) => string | null;
  getPrevCellInWord: (cellId: string, wordId: string) => string | null;
  getNextEmptyCellInWord: (cellId: string, wordId: string) => string | null;
  getPrevEmptyCellInWord: (cellId: string, wordId: string) => string | null;
  useHint: (cellId: string) => boolean;
}

export const useCrosswordStore = create<CrosswordState>((set, get) => ({
  crossword: null,
  cells: [],
  words: [],
  activeCellId: null,
  activeWordId: null,
  hints: 10,
  hintCells: new Set<string>(),

  loadCrossword: (data: CrosswordData) => {
    set({
      crossword: data,
      cells: data.cells,
      words: data.words,
      activeCellId: null,
      activeWordId: null,
      hints: 10,
      hintCells: new Set<string>(),
    });
  },

  reset: () => {
    set({
      crossword: null,
      cells: [],
      words: [],
      activeCellId: null,
      activeWordId: null,
      hints: 10,
      hintCells: new Set<string>(),
    });
  },

  setActiveCell: (cellId: string | null, wordId?: string) => {
    const state = get();
    if (!cellId) {
      set({ activeCellId: null, activeWordId: null });
      return;
    }

    const cell = state.cells.find((c) => c.id === cellId);
    if (!cell) return;

    let resolvedWordId = wordId ?? null;
    if (!resolvedWordId) {
      const word = state.words.find((w) => w.cells.includes(cellId));
      resolvedWordId = word ? word.id : state.activeWordId;
    }

    set({
      activeCellId: cellId,
      activeWordId: resolvedWordId,
    });
  },

  setActiveWord: (wordId: string | null) => {
    set({ activeWordId: wordId });
  },

  setInput: (cellId: string, value: string, playerColor?: string, playerId?: string) => {
    set((state) => ({
      cells: state.cells.map((cell) =>
        cell.id === cellId 
          ? { 
              ...cell, 
              userInput: value.toUpperCase().slice(-1),
              playerColor: playerColor || cell.playerColor,
              playerId: playerId || cell.playerId
            } 
          : cell
      ),
    }));
    setTimeout(() => get().checkWords(), 0);
  },

  clearInput: (cellId: string) => {
    set((state) => ({
      cells: state.cells.map((cell) =>
        cell.id === cellId ? { ...cell, userInput: '', playerColor: undefined, playerId: undefined } : cell
      ),
    }));
  },

  checkWords: () => {
    const state = get();
    const updatedWords = state.words.map((word) => {
      if (word.isSolved) return word;

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
    return state.words.some((w) => w.isSolved && w.cells.includes(cellId)) || state.hintCells.has(cellId);
  },

  getClueForCell: (cellId: string) => {
    const state = get();
    const word = state.words.find((w) => w.cells.includes(cellId));
    if (!word) return null;
    return { clueText: word.clueText, wordId: word.id };
  },

  getSolvedWordForCell: (cellId: string) => {
    const state = get();
    const solvedWord = state.words.find((w) => w.isSolved && w.cells.includes(cellId));
    if (!solvedWord) return null;
    
    const wordText = solvedWord.cells
      .map((cid) => state.cells.find((c) => c.id === cid)?.userInput || '')
      .join('');
    
    return { clueText: solvedWord.clueText, wordId: solvedWord.id, wordText };
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

  getNextEmptyCellInWord: (cellId: string, wordId: string) => {
    const state = get();
    const word = state.words.find((w) => w.id === wordId);
    if (!word) return null;
    const idx = word.cells.indexOf(cellId);
    if (idx === -1) return null;
    
    for (let i = idx + 1; i < word.cells.length; i++) {
      const nextCellId = word.cells[i];
      const nextCell = state.cells.find((c) => c.id === nextCellId);
      if (nextCell && nextCell.type === 'empty' && nextCell.userInput === '') {
        return nextCellId;
      }
    }
    return null;
  },

  getPrevEmptyCellInWord: (cellId: string, wordId: string) => {
    const state = get();
    const word = state.words.find((w) => w.id === wordId);
    if (!word) return null;
    const idx = word.cells.indexOf(cellId);
    if (idx <= 0) return null;
    
    for (let i = idx - 1; i >= 0; i--) {
      const prevCellId = word.cells[i];
      const prevCell = state.cells.find((c) => c.id === prevCellId);
      if (prevCell && prevCell.type === 'empty' && prevCell.userInput === '') {
        return prevCellId;
      }
    }
    return null;
  },

  useHint: (cellId: string) => {
    const state = get();
    if (state.hints <= 0) return false;
    
    const cell = state.cells.find((c) => c.id === cellId);
    if (!cell || !cell.answerLetter) return false;
    
    if (state.hintCells.has(cellId)) return false;
    
    set((state) => {
      const newHintCells = new Set(state.hintCells);
      newHintCells.add(cellId);
      
      return {
        cells: state.cells.map((c) =>
          c.id === cellId ? { ...c, userInput: cell.answerLetter! } : c
        ),
        hints: state.hints - 1,
        hintCells: newHintCells,
      };
    });
    
    setTimeout(() => get().checkWords(), 0);
    return true;
  },
}));
