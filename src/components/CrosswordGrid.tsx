import React, { useEffect, useRef, useCallback } from 'react';
import Cell from './Cell';
import { useCrosswordStore } from '../store/crosswordStore';
import { CrosswordData } from '../types/crossword';

interface CrosswordGridProps {
  crossword: CrosswordData;
}

const CrosswordGrid: React.FC<CrosswordGridProps> = ({ crossword }) => {
  const cells = useCrosswordStore((s) => s.cells);
  const words = useCrosswordStore((s) => s.words);
  const activeCellId = useCrosswordStore((s) => s.activeCellId);
  const activeWordId = useCrosswordStore((s) => s.activeWordId);
  const setActiveCell = useCrosswordStore((s) => s.setActiveCell);
  const setActiveWord = useCrosswordStore((s) => s.setActiveWord);
  const setInput = useCrosswordStore((s) => s.setInput);
  const clearInput = useCrosswordStore((s) => s.clearInput);
  const isCellInActiveWord = useCrosswordStore((s) => s.isCellInActiveWord);
  const isCellSolved = useCrosswordStore((s) => s.isCellSolved);
  const getNextCellInWord = useCrosswordStore((s) => s.getNextCellInWord);
  const getPrevCellInWord = useCrosswordStore((s) => s.getPrevCellInWord);
  const getNextEmptyCellInWord = useCrosswordStore((s) => s.getNextEmptyCellInWord);
  const getPrevEmptyCellInWord = useCrosswordStore((s) => s.getPrevEmptyCellInWord);

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
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        const input = inputRefs.current.get(activeCellId);
        if (input) {
          if (!input.readOnly) {
            input.focus();
            input.select();
            input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            // If cell is readOnly (solved), try to find next non-solved cell in active word
            const currentActiveWordId = useCrosswordStore.getState().activeWordId;
            if (currentActiveWordId) {
              const word = words.find((w) => w.id === currentActiveWordId);
              if (word) {
                const nextNonSolved = word.cells.find((cid) => !isCellSolved(cid));
                if (nextNonSolved && nextNonSolved !== activeCellId) {
                  setActiveCell(nextNonSolved, currentActiveWordId);
                }
              }
            }
          }
        }
      });
    }
  }, [activeCellId, words, isCellSolved, setActiveCell]);

  // Handle clue cell click - focus first EMPTY letter of target word
  const handleCellFocus = useCallback(
    (cellId: string) => {
      const cell = cells.find((c) => c.id === cellId);
      if (!cell) return;

      if (cell.type === 'clue' && cell.targetWordId) {
        const word = words.find((w) => w.id === cell.targetWordId);
        if (word && word.cells.length > 0) {
          // Find first EMPTY and NOT SOLVED cell in the word
          const firstEmptyCellId = word.cells.find((cid) => {
            const c = cells.find((cc) => cc.id === cid);
            return c && c.type === 'empty' && c.userInput === '' && !useCrosswordStore.getState().isCellSolved(cid);
          });
          
          // If all cells are filled, find first non-solved cell
          const targetCellId = firstEmptyCellId || word.cells.find((cid) => !useCrosswordStore.getState().isCellSolved(cid)) || word.cells[0];
          setActiveWord(word.id);
          setActiveCell(targetCellId, word.id);
        }
      } else if (cell.type === 'empty') {
        // Find which word this cell belongs to
        // If cell is on intersection, prefer the currently active word if it contains this cell
        const currentWordId = useCrosswordStore.getState().activeWordId;
        const currentWord = currentWordId ? words.find((w) => w.id === currentWordId) : null;
        
        let word;
        if (currentWord && currentWord.cells.includes(cellId)) {
          word = currentWord;
        } else {
          word = words.find((w) => w.cells.includes(cellId));
        }
        
        setActiveCell(cellId, word?.id);
      }
    },
    [cells, words, setActiveCell, setActiveWord]
  );

  // Handle input
  const handleInput = useCallback(
    (cellId: string, value: string) => {
      if (!value) return;
      const letter = value.toUpperCase().slice(-1);
      if (!/[А-ЯЁA-Z]/.test(letter)) return;

      setInput(cellId, letter);

      // Auto-advance to next EMPTY cell — skip filled cells
      const currentActiveWordId = useCrosswordStore.getState().activeWordId;
      if (currentActiveWordId) {
        const nextEmptyCellId = getNextEmptyCellInWord(cellId, currentActiveWordId);
        if (nextEmptyCellId) {
          setTimeout(() => {
            setActiveCell(nextEmptyCellId, currentActiveWordId);
          }, 10);
        }
      }
    },
    [setInput, getNextEmptyCellInWord, setActiveCell]
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, cellId: string) => {
      const currentActiveWordId = useCrosswordStore.getState().activeWordId;

      if (e.key === 'Backspace') {
        e.preventDefault();
        const cell = cells.find((c) => c.id === cellId);
        if (!cell) return;

        // Don't allow deletion from solved cells
        if (isCellSolved(cellId)) {
          return;
        }

        if (cell.userInput !== '') {
          // Cell has content — clear it and stay on it
          clearInput(cellId);
        } else if (currentActiveWordId) {
          // Cell is empty — find previous non-solved cell in word
          let prevCellId = getPrevCellInWord(cellId, currentActiveWordId);
          
          // Skip over solved cells
          while (prevCellId && isCellSolved(prevCellId)) {
            prevCellId = getPrevCellInWord(prevCellId, currentActiveWordId);
          }
          
          if (prevCellId) {
            const prevCell = cells.find((c) => c.id === prevCellId);
            if (prevCell && prevCell.userInput !== '') {
              // Previous cell has content — clear it and move to it
              clearInput(prevCellId);
              setActiveCell(prevCellId, currentActiveWordId);
            } else {
              // Previous cell is also empty — just move to it
              setActiveCell(prevCellId, currentActiveWordId);
            }
          }
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
          const word = words.find((w) => w.cells.includes(targetCell.id));
          setActiveCell(targetCell.id, word?.id);
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
          setActiveWord(nextWord.id);
          setActiveCell(nextWord.cells[0], nextWord.id);
        }
      }
    },
    [cells, words, setActiveCell, setActiveWord, clearInput, getPrevEmptyCellInWord]
  );

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
