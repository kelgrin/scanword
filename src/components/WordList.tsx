import React from 'react';
import { Word } from '../types/crossword';
import { useCrosswordStore } from '../store/crosswordStore';

interface WordListProps {
  words: Word[];
}

const WordList: React.FC<WordListProps> = ({ words }) => {
  const storeWords = useCrosswordStore((s) => s.words);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sticky top-24 transition-colors">
      <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
        Список слов
      </h2>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {words.map((word) => {
          const storeWord = storeWords.find((w) => w.id === word.id);
          const isSolved = storeWord?.isSolved || false;
          return (
            <div
              key={word.id}
              className={`p-2 rounded-lg text-sm transition-colors ${
                isSolved
                  ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-700'
                  : 'bg-gray-50 border border-gray-100 dark:bg-gray-700 dark:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                    isSolved ? 'bg-green-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {isSolved ? '✓' : word.id.replace('w', '')}
                </span>
                <span
                  className={`text-xs leading-tight ${
                    isSolved ? 'text-green-700 dark:text-green-400 line-through' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {word.clueText}
                </span>
              </div>
              <div className="mt-1 ml-7 text-xs text-gray-400 dark:text-gray-500">
                {word.cells.length} букв
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WordList;
