import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Cell as CellType } from '../types/crossword';
import { useCrosswordStore } from '../store/crosswordStore';
import ClueTooltip from './ClueTooltip';

interface CellProps {
  cell: CellType;
  isActive: boolean;
  isInActiveWord: boolean;
  isSolved: boolean;
  onFocus: (cellId: string) => void;
  onInput: (cellId: string, value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, cellId: string) => void;
}

const Cell = forwardRef<HTMLInputElement, CellProps>(
  ({ cell, isActive, isInActiveWord, isSolved, onFocus, onInput, onKeyDown }, ref) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [showHoverTooltip, setShowHoverTooltip] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const words = useCrosswordStore((s) => s.words);
    const getSolvedWordForCell = useCrosswordStore((s) => s.getSolvedWordForCell);

    // Close tooltip when clicking outside
    useEffect(() => {
      if (!showTooltip) return;
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setShowTooltip(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showTooltip]);

    // Hover tooltip for clue cells
    const handleMouseEnter = () => {
      if (cell.type === 'clue' && cell.clueText) {
        hoverTimeoutRef.current = setTimeout(() => {
          setShowHoverTooltip(true);
        }, 1000);
      }
    };

    const handleMouseLeave = () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setShowHoverTooltip(false);
    };

    useEffect(() => {
      return () => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
      };
    }, []);

    const handleClueClick = () => {
      if (cell.targetWordId) {
        const targetWord = words.find((w) => w.id === cell.targetWordId);
        if (targetWord?.isSolved) {
          setShowTooltip(!showTooltip);
        } else {
          // Focus first EMPTY cell of target word
          // Pass the clue cell ID, CrosswordGrid will find the correct target
          onFocus(cell.id);
        }
      }
    };

    const handleEmptyCellClick = () => {
      if (isSolved) {
        // Show tooltip for solved words
        setShowTooltip(!showTooltip);
      } else {
        onFocus(cell.id);
      }
    };

    const handleInputClick = (e: React.MouseEvent) => {
      if (isSolved) {
        e.stopPropagation();
        setShowTooltip(!showTooltip);
      }
    };

    const getDirectionIcon = () => {
      if (!cell.direction) return null;
      const iconSize = 14;
      switch (cell.direction) {
        case 'right':
          return <ArrowRight size={iconSize} className="text-gray-600 dark:text-gray-300" strokeWidth={2.5} />;
        case 'down':
          return <ArrowDown size={iconSize} className="text-gray-600 dark:text-gray-300" strokeWidth={2.5} />;
        case 'left':
          return <ArrowLeft size={iconSize} className="text-gray-600 dark:text-gray-300" strokeWidth={2.5} />;
        case 'up':
          return <ArrowUp size={iconSize} className="text-gray-600 dark:text-gray-300" strokeWidth={2.5} />;
        case 'up-right':
          return <ArrowUp size={iconSize} className="text-gray-600 dark:text-gray-300 rotate-45" strokeWidth={2.5} />;
        case 'up-left':
          return <ArrowUp size={iconSize} className="text-gray-600 dark:text-gray-300 -rotate-45" strokeWidth={2.5} />;
        case 'down-right':
          return <ArrowDown size={iconSize} className="text-gray-600 dark:text-gray-300 -rotate-45" strokeWidth={2.5} />;
        case 'down-left':
          return <ArrowDown size={iconSize} className="text-gray-600 dark:text-gray-300 rotate-45" strokeWidth={2.5} />;
        default:
          return null;
      }
    };

    if (cell.type === 'black') {
      return (
        <div
          className="bg-gray-700 dark:bg-gray-900 rounded-sm"
          style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }}
        />
      );
    }

    if (cell.type === 'clue') {
      const targetWord = cell.targetWordId ? words.find((w) => w.id === cell.targetWordId) : null;
      const isWordSolved = targetWord?.isSolved ?? false;

      return (
        <div
          ref={containerRef}
          className={`relative flex flex-col items-center justify-center rounded-sm border transition-all duration-200 cursor-pointer overflow-visible
            ${isWordSolved ? 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700'}
            ${isActive ? 'ring-2 ring-blue-500 z-10' : ''}
          `}
          style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1, zIndex: showHoverTooltip ? 100 : undefined }}
          onClick={handleClueClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span className="text-[8px] leading-[1.2] text-gray-700 dark:text-gray-300 text-center px-0.5 font-medium">
            {cell.clueText}
          </span>
          <div className="mt-0.5">
            {getDirectionIcon()}
          </div>
          {showTooltip && targetWord && (
            <ClueTooltip
              text={targetWord.clueText}
              wordText={targetWord.cells
                .map((cid) => {
                  const c = useCrosswordStore.getState().cells.find((cc) => cc.id === cid);
                  return c?.userInput || '';
                })
                .join('')}
              onClose={() => setShowTooltip(false)}
              x={cell.x}
              y={cell.y}
            />
          )}
          {/* Hover tooltip with full clue text */}
          {showHoverTooltip && !showTooltip && cell.clueText && (
            <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-lg whitespace-nowrap max-w-xs">
              <div className="font-medium">{cell.clueText}</div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
            </div>
          )}
        </div>
      );
    }

    // Empty cell with input
    // FIX bug #4: use getSolvedWordForCell to find the correct solved word
    const solvedWordInfo = isSolved ? getSolvedWordForCell(cell.id) : null;

    return (
      <div
        ref={containerRef}
        className={`relative flex items-center justify-center rounded-sm border transition-all duration-200
          ${isSolved ? 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700 cursor-pointer' : ''}
          ${isInActiveWord && !isSolved ? 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700' : ''}
          ${!isInActiveWord && !isSolved ? 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600' : ''}
          ${isActive && !isSolved ? 'ring-2 ring-blue-500 z-10' : ''}
        `}
        style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }}
        onClick={handleEmptyCellClick}
      >
        <input
          ref={ref}
          type="text"
          value={cell.userInput}
          onChange={(e) => onInput(cell.id, e.target.value)}
          onKeyDown={(e) => onKeyDown(e, cell.id)}
          onClick={handleInputClick}
          onFocus={() => {
            if (!isSolved) {
              onFocus(cell.id);
            }
          }}
          readOnly={isSolved}
          tabIndex={isSolved ? -1 : 0}
          maxLength={2}
          className={`w-full h-full text-center text-base font-bold bg-transparent outline-none uppercase cursor-pointer
            ${isSolved ? 'text-green-700 dark:text-green-400' : ''}
          `}
          style={{
            color: isSolved ? undefined : (cell.playerColor || undefined)
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
        {showTooltip && solvedWordInfo && (
          <ClueTooltip
            text={solvedWordInfo.clueText}
            wordText={solvedWordInfo.wordText}
            onClose={() => setShowTooltip(false)}
            x={cell.x}
            y={cell.y}
          />
        )}
      </div>
    );
  }
);

Cell.displayName = 'Cell';

export default Cell;
