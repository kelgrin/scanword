import React, { useEffect, useRef, useCallback } from 'react';
import Cell from './Cell';
import { useCrosswordStore } from '../store/crosswordStore';
import { CrosswordData } from '../types/crossword';

interface CrosswordGridProps {
  crossword: CrosswordData;
  playerColor?: string;
  playerId?: string;
}

const CrosswordGrid: React.FC<CrosswordGridProps> = ({ crossword, playerColor, playerId }) => {
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

  useEffect(() => {
    if (activeCellId) {
      requestAnimationFrame(() => {
        const input = inputRefs.current.get(activeCellId);
        if (input) {
          if (!input.readOnly) {
            input.focus();
            input.select();
            input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
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

  const handleCellFocus = useCallback(
    (cellId: string) => {
      const cell = cells.find((c) => c.id === cellId);
      if (!cell) return;

      if (cell.type === 'clue' && cell.targetWordId) {
        const word = words.find((w) => w.id === cell.targetWordId);
        if (word && word.cells.length > 0) {
          const firstEmptyCellId = word.cells.find((cid) => {
            const c = cells.find((cc) => cc.id === cid);
            return c && c.type === 'empty' && !c.userInput && !useCrosswordStore.getState().isCellSolved(cid);
          });

          const targetCellId = firstEmptyCellId || word.cells.find((cid) => !useCrosswordStore.getState().isCellSolved(cid)) || word.cells[0];
          setActiveWord(word.id);
          setActiveCell(targetCellId, word.id);
        }
      } else if (cell.type === 'empty') {
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

  const handleInput = useCallback(
    (cellId: string, value: string) => {
      if (!value) return;
      const letter = value.toUpperCase().slice(-1);
      if (!/[А-ЯЁA-Z]/.test(letter)) return;

      const cell = cells.find((c) => c.id === cellId);
      if (cell && cell.userInput && playerId && cell.playerId && cell.playerId !== playerId) {
        return;
      }

      setInput(cellId, letter, playerColor, playerId);

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
    [setInput, getNextEmptyCellInWord, setActiveCell, playerColor, playerId, cells]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, cellId: string) => {
      const currentActiveWordId = useCrosswordStore.getState().activeWordId;

      if (e.key === 'Backspace') {
        e.preventDefault();
        const cell = cells.find((c) => c.id === cellId);
        if (!cell) return;

        if (isCellSolved(cellId)) {
          return;
        }

        if (cell.userInput !== '') {
          if (playerId && cell.playerId && cell.playerId !== playerId) {
            if (currentActiveWordId) {
              let prevCellId = getPrevCellInWord(cellId, currentActiveWordId);
              while (prevCellId && isCellSolved(prevCellId)) {
                prevCellId = getPrevCellInWord(prevCellId, currentActiveWordId);
              }
              if (prevCellId) {
                setActiveCell(prevCellId, currentActiveWordId);
              }
            }
            return;
          }
          clearInput(cellId);
        } else if (currentActiveWordId) {
          let prevCellId = getPrevCellInWord(cellId, currentActiveWordId);
          
          while (prevCellId && isCellSolved(prevCellId)) {
            prevCellId = getPrevCellInWord(prevCellId, currentActiveWordId);
          }
          
          if (prevCellId) {
            const prevCell = cells.find((c) => c.id === prevCellId);
            if (prevCell && prevCell.userInput !== '') {
              if (playerId && prevCell.playerId && prevCell.playerId !== playerId) {
                let skipCellId = getPrevCellInWord(prevCellId, currentActiveWordId);
                while (skipCellId && isCellSolved(skipCellId)) {
                  skipCellId = getPrevCellInWord(skipCellId, currentActiveWordId);
                }
                if (skipCellId) {
                  setActiveCell(skipCellId, currentActiveWordId);
                }
              } else {
                clearInput(prevCellId);
                setActiveCell(prevCellId, currentActiveWordId);
              }
            } else {
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
    [cells, words, setActiveCell, setActiveWord, clearInput, getPrevCellInWord, playerId]
  );

  return (
    <div
      className="crossword-grid inline-grid gap-[2px] bg-gray-300 dark:bg-gray-700 p-[2px] rounded-lg shadow-inner transition-colors"
      style={{
        gridTemplateColumns: `repeat(${crossword.width}, 60px)`,
        gridTemplateRows: `repeat(${crossword.height}, 60px)`,
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
