import React, { useEffect } from 'react';
import { useCrosswordStore } from './store/crosswordStore';
import CrosswordGrid from './components/CrosswordGrid';
import { Loader2, Trophy, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  const loadCrossword = useCrosswordStore((s) => s.loadCrossword);
  const loading = useCrosswordStore((s) => s.loading);
  const error = useCrosswordStore((s) => s.error);
  const crossword = useCrosswordStore((s) => s.crossword);
  const getProgress = useCrosswordStore((s) => s.getProgress);
  const words = useCrosswordStore((s) => s.words);

  useEffect(() => {
    loadCrossword('crossword-1');
  }, [loadCrossword]);

  const progress = getProgress();
  const isComplete = progress.solved === progress.total && progress.total > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-gray-600 text-lg">Загрузка сканворда...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <p className="text-red-500 text-lg">{error}</p>
          <button
            onClick={() => loadCrossword('crossword-1')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">С</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800 leading-tight">Сканворд</h1>
              <p className="text-xs text-gray-500">{crossword?.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress */}
            <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2 border border-stone-200">
              {isComplete ? (
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500 animate-pop-in" />
                  <span className="text-sm font-semibold text-green-600 hidden sm:inline">
                    Победа! 🎉
                  </span>
                </div>
              ) : (
                <>
                  <div className="text-sm text-gray-600 whitespace-nowrap">
                    <span className="font-bold text-blue-600">{progress.solved}</span>
                    <span className="text-gray-400">/</span>
                    <span>{progress.total}</span>
                  </div>
                  <div className="w-16 sm:w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(progress.solved / progress.total) * 100}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-5">
          {/* Completion Banner */}
          {isComplete && (
            <div className="w-full max-w-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-6 py-4 text-center animate-pop-in">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-green-700">Поздравляем!</h2>
              <p className="text-sm text-green-600 mt-1">Вы разгадали все слова в сканворде!</p>
              <button
                onClick={() => loadCrossword('crossword-1')}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Начать заново
              </button>
            </div>
          )}

          {/* Instructions */}
          {!isComplete && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-3 max-w-lg text-center">
              <p className="text-xs sm:text-sm text-gray-500">
                <span className="font-semibold text-gray-700">Подсказка:</span>{' '}
                Нажмите на клетку с вопросом для начала ввода.{' '}
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] border border-gray-200 font-mono">Tab</kbd> — следующее слово,{' '}
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] border border-gray-200 font-mono">←→↑↓</kbd> — навигация
              </p>
            </div>
          )}

          {/* Crossword Grid */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 overflow-x-auto max-w-full">
            <CrosswordGrid />
          </div>

          {/* Word list */}
          <div className="w-full max-w-lg">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              Список слов
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {words.map((word, idx) => (
                <div
                  key={word.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-300
                    ${word.isSolved
                      ? 'bg-green-50 border-green-200 shadow-sm'
                      : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm'
                    }
                  `}
                >
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0
                    ${word.isSolved ? 'bg-green-200 text-green-700' : 'bg-gray-100 text-gray-500'}
                  `}>
                    {word.isSolved ? '✓' : idx + 1}
                  </span>
                  <span className={`text-sm leading-tight
                    ${word.isSolved ? 'text-green-700 line-through decoration-green-300' : 'text-gray-600'}
                  `}>
                    {word.clueText}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400">
        Сканворд — решай кроссворды онлайн • React + TypeScript + Zustand
      </footer>
    </div>
  );
};

export default App;
