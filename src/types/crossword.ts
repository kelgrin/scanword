export type CellType = 'black' | 'empty' | 'clue';
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Cell {
  id: string;
  x: number;
  y: number;
  type: CellType;
  clueText?: string;
  direction?: Direction;
  targetWordId?: string;
  answerLetter?: string;
  userInput: string;
}

export interface Word {
  id: string;
  cells: string[]; // array of cell ids
  clueText: string;
  isSolved: boolean;
}

export interface CrosswordData {
  id: string;
  title: string;
  width: number;
  height: number;
  cells: Cell[];
  words: Word[];
}
