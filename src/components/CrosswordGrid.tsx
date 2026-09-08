import React, { useEffect, useRef, useCallback } from 'react';
import Cell from './Cell';
import { useCrosswordStore } from '../store/crosswordStore';

const CrosswordGrid: React.FC = () => {
  const cells = useCrosswordStore((s) => s.cells);
  const words = useCrosswordStore((s) => s.words);
  const crossword = useCrosswordStore((s) => s.crossword);
  const activeCellId = useCrosswordStore((s) => s.activeCellId);
  const activeWordId = useCrosswordStore((s) => s.activeWordId);
  const setActiveCell = useCrosswordStore((s) => s.setActiveCell);
  const setInput = useCrosswordStore((s) => s.setInput);
  const clearInput = useCrosswordStore((s) => s.clearInput);
  const isCellInActiveWord = useCrosswordStore((s) => s.isCellInActiveWord);
  const isCellSolved = useCrosswordStore((s) => s.isCellSolved);

  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const setRef = useCallback((cellId: string, el: HTMLInputElement | null) => {
    if (el) {
      inputRefs.current.set(cellId, el);
    } else {
      inputRefs.current.delete(cellId);
    }
  }, []);

  // Focus active cell
  useEffect(() => {
    if (activeCellId) {
      const input = inputRefs.current.get(activeCellId);
      if (input) {
        input.focus();
        input.select();
        // Scroll into view for mobile
        input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeCellId]);

  // Get next cell in word direction
  const getNextCellInWord = useCallback(
    (currentCellId: string, wordId: string): string | null => {
      const word = words.find((w) => w.id === wordId);
      if (!word) return null;
      const idx = word.cells.indexOf(currentCellId);
      if (idx < word.cells.length - 1) {
        return word.cells[idx + 1];
      }
      return null;
    },
    [words]
  );

  const getPrevCellInWord = useCallback(
    (currentCellId: string, wordId: string): string | null => {
      const word = words.find((w) => w.id === wordId);
      if (!word) return null;
      const idx = word.cells.indexOf(currentCellId);
      if (idx > 0) {
        return word.cells[idx - 1];
      }
      return null;
    },
    [words]
  );

  // Handle clue cell click - focus first letter of target word
  const handleCellFocus = useCallback(
    (cellId: string) => {
      const cell = cells.find((c) => c.id === cellId);
      if (!cell) return;

      if (cell.type === 'clue' && cell.targetWordId) {
        const word = words.find((w) => w.id === cell.targetWordId);
        if (word && word.cells.length > 0) {
          setActiveCell(word.cells[0]);
          useCrosswordStore.getState().setActiveWord(word.id);
        }
      } else if (cell.type === 'empty') {
        // Find which word this cell belongs to
        const word = words.find((w) => w.cells.includes(cellId));
        setActiveCell(cellId);
        if (word) {
          useCrosswordStore.getState().setActiveWord(word.id);
        }
      }
    },
    [cells, words, setActiveCell]
  );

  // Handle input
  const handleInput = useCallback(
    (cellId: string, value: string) => {
      if (!value) return;
      const letter = value.toUpperCase().slice(-1);
      if (!/[А-ЯЁA-Z]/.test(letter)) return;

      setInput(cellId, letter);

      // Auto-advance to next cell
      const currentActiveWordId = useCrosswordStore.getState().activeWordId;
      if (currentActiveWordId) {
        const nextCellId = getNextCellInWord(cellId, currentActiveWordId);
        if (nextCellId) {
          const nextCell = cells.find((c) => c.id === nextCellId);
          if (nextCell && nextCell.type === 'empty' && !isCellSolved(nextCellId)) {
            setTimeout(() => {
              setActiveCell(nextCellId);
            }, 10);
          }
        }
      }
    },
    [setInput, getNextCellInWord, cells, setActiveCell, isCellSolved]
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, cellId: string) => {
      const currentActiveWordId = useCrosswordStore.getState().activeWordId;

      if (e.key === 'Backspace') {
        const cell = cells.find((c) => c.id === cellId);
        if (cell && cell.userInput === '' && currentActiveWordId) {
          // Move to previous cell and clear it
          const prevCellId = getPrevCellInWord(cellId, currentActiveWordId);
          if (prevCellId) {
            e.preventDefault();
            clearInput(prevCellId);
            setActiveCell(prevCellId);
          }
        } else if (cell && cell.userInput !== '') {
          // Current cell will be cleared by default behavior
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const cell = cells.find((c) => c.id === cellId);
        if (!cell) return;

        let targetX = cell.x;
        let targetY = cell.y;

        switch (e.key) {
          case 'ArrowRight': targetX += 1; break;
          case 'ArrowLeft': targetX -= 1; break;
          case 'ArrowDown': targetY += 1; break;
          case 'ArrowUp': targetY -= 1; break;
        }

        // Find nearest empty cell in that direction
        const targetCell = cells.find(
          (c) => c.x === targetX && c.y === targetY && c.type === 'empty'
        );
        if (targetCell) {
          // Find word for the new cell
          const word = words.find((w) => w.cells.includes(targetCell.id));
          setActiveCell(targetCell.id);
          if (word) {
            useCrosswordStore.getState().setActiveWord(word.id);
          }
        }
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        // Move to next word
        const currentIdx = words.findIndex((w) => w.id === currentActiveWordId);
        const nextIdx = e.shiftKey
          ? (currentIdx - 1 + words.length) % words.length
          : (currentIdx + 1) % words.length;
        const nextWord = words[nextIdx];
        if (nextWord && nextWord.cells.length > 0) {
          setActiveCell(nextWord.cells[0]);
          useCrosswordStore.getState().setActiveWord(nextWord.id);
        }
      }
    },
    [cells, words, setActiveCell, clearInput, getPrevCellInWord]
  );

  if (!crossword) return null;

  return (
    <div
      className="crossword-grid inline-grid gap-[2px] bg-gray-300 p-[2px] rounded-lg shadow-inner"
      style={{
        gridTemplateColumns: `repeat(${crossword.width}, 1fr)`,
        gridTemplateRows: `repeat(${crossword.height}, 1fr)`,
      }}
    >
      {cells.map((cell) => (
        <Cell
          key={cell.id}
          ref={(el) => setRef(cell.id, el)}
          cell={cell}
          isActive={activeCellId === cell.id}
          isInActiveWord={isCellInActiveWord(cell.id)}
          isSolved={isCellSolved(cell.id)}
          onFocus={handleCellFocus}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
        />
      ))}
    </div>
  );
};

export default CrosswordGrid;
