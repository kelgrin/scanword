import React, { forwardRef, useState } from 'react';
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
    const words = useCrosswordStore((s) => s.words);

    const handleClueClick = () => {
      if (cell.targetWordId) {
        const targetWord = words.find((w) => w.id === cell.targetWordId);
        if (targetWord?.isSolved) {
          setShowTooltip(!showTooltip);
        } else {
          // Focus first cell of target word
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

    const getDirectionIcon = () => {
      if (!cell.direction) return null;
      const iconSize = 14;
      switch (cell.direction) {
        case 'up':
          return <ArrowUp size={iconSize} className="text-gray-500" />;
        case 'down':
          return <ArrowDown size={iconSize} className="text-gray-500" />;
        case 'left':
          return <ArrowLeft size={iconSize} className="text-gray-500" />;
        case 'right':
          return <ArrowRight size={iconSize} className="text-gray-500" />;
      }
    };

    if (cell.type === 'black') {
      return (
        <div
          className="bg-gray-700 rounded-sm"
          style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }}
        />
      );
    }

    if (cell.type === 'clue') {
      const targetWord = cell.targetWordId ? words.find((w) => w.id === cell.targetWordId) : null;
      const isWordSolved = targetWord?.isSolved ?? false;

      return (
        <div
          className={`relative flex flex-col items-center justify-center rounded-sm border transition-all duration-200 cursor-pointer overflow-hidden
            ${isWordSolved ? 'bg-green-100 border-green-300' : 'bg-amber-50 border-amber-200'}
            ${isActive ? 'ring-2 ring-blue-500 z-10' : ''}
          `}
          style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }}
          onClick={handleClueClick}
        >
          <span className="text-[7px] leading-[1.2] text-gray-600 text-center px-0.5 overflow-hidden line-clamp-2 font-medium">
            {cell.clueText}
          </span>
          <div className="mt-0.5">
            {getDirectionIcon()}
          </div>
          {showTooltip && targetWord && (
            <ClueTooltip
              text={targetWord.clueText}
              onClose={() => setShowTooltip(false)}
              x={cell.x}
              y={cell.y}
            />
          )}
        </div>
      );
    }

    // Empty cell with input
    const clueInfo = useCrosswordStore.getState().getClueForCell(cell.id);

    return (
      <div
        className={`relative flex items-center justify-center rounded-sm border transition-all duration-200
          ${isSolved ? 'bg-green-100 border-green-300 cursor-pointer' : ''}
          ${isInActiveWord && !isSolved ? 'bg-yellow-100 border-yellow-300' : ''}
          ${!isInActiveWord && !isSolved ? 'bg-white border-gray-200' : ''}
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
          onFocus={() => {
            if (!isSolved) {
              onFocus(cell.id);
            }
          }}
          readOnly={isSolved}
          maxLength={2}
          className={`w-full h-full text-center text-lg font-bold bg-transparent outline-none uppercase
            ${isSolved ? 'text-green-700 cursor-pointer' : 'text-gray-800 cursor-pointer'}
          `}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
        {showTooltip && clueInfo && (
          <ClueTooltip
            text={clueInfo.clueText}
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
