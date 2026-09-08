import { useEffect, useState, useRef } from 'react';
import { CrosswordData } from './types/crossword';
import { crosswordApi } from './services/crosswordApi';
import { useCrosswordStore } from './store/crosswordStore';
import CrosswordGrid from './components/CrosswordGrid';
import WordList from './components/WordList';
import DraggableGrid from './components/DraggableGrid';
import { Shuffle, Trophy, Lightbulb, Timer, Sun, Moon } from 'lucide-react';

function App() {
  const [crossword, setCrossword] = useState<CrosswordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const solvedCount = useCrosswordStore((state) => state.getSolvedCount());
  const totalWords = useCrosswordStore((state) => state.words.length);
  const resetStore = useCrosswordStore((state) => state.reset);
  const hints = useCrosswordStore((state) => state.hints);
  const activeCellId = useCrosswordStore((state) => state.activeCellId);
  const useHint = useCrosswordStore((state) => state.useHint);

  useEffect(() => {
    loadCrossword();
  }, []);

  // Theme logic
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Timer logic
  useEffect(() => {
    if (!loading && crossword) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [loading, crossword]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadCrossword = async () => {
    setLoading(true);
    setElapsedSeconds(0);
    const data = await crosswordApi.fetchCrossword('crossword-1');
    setCrossword(data);
    useCrosswordStore.getState().loadCrossword(data);
    setLoading(false);
  };

  const generateNew = async () => {
    setLoading(true);
    setElapsedSeconds(0);
    resetStore();
    const data = await crosswordApi.generateNew();
    setCrossword(data);
    useCrosswordStore.getState().loadCrossword(data);
    setLoading(false);
  };

  const handleUseHint = () => {
    if (hints > 0 && activeCellId) {
      const success = useHint(activeCellId);
      if (success) {
        // Move to next empty cell in the active word
        const currentActiveWordId = useCrosswordStore.getState().activeWordId;
        if (currentActiveWordId) {
          const nextEmptyCellId = useCrosswordStore.getState().getNextEmptyCellInWord(activeCellId, currentActiveWordId);
          if (nextEmptyCellId) {
            setTimeout(() => {
              useCrosswordStore.getState().setActiveCell(nextEmptyCellId, currentActiveWordId);
            }, 10);
          }
        }
      }
    }
  };

  const isCompleted = totalWords > 0 && solvedCount === totalWords;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">Генерируем сканворд...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 transition-colors">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm sticky top-0 z-50 transition-colors">
        <div className="max-w-full mx-auto px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-base">С</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Сканворд</h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Решай кроссворды онлайн</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {isCompleted ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Trophy className="w-3.5 h-3.5" /> Все угадано!
                    </span>
                  ) : (
                    `Угадано: ${solvedCount} / ${totalWords}`
                  )}
                </p>
                <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${totalWords > 0 ? (solvedCount / totalWords) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={isDarkMode ? 'Светлая тема' : 'Тёмная тема'}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-yellow-500" />
              ) : (
                <Moon className="w-4 h-4 text-gray-600" />
              )}
            </button>

            {/* Hint button */}
            <button
              onClick={handleUseHint}
              disabled={hints <= 0 || !activeCellId}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all shadow-md active:scale-95 ${
                hints > 0 && activeCellId
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white hover:from-yellow-500 hover:to-amber-600 hover:shadow-lg'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
              title={hints > 0 ? 'Показать букву на активной клетке' : 'Подсказки закончились'}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-sm">{hints}</span>
            </button>

            {/* New crossword button */}
            <button
              onClick={generateNew}
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-lg hover:from-amber-500 hover:to-orange-600 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-sm">Новый</span>
            </button>
          </div>
        </div>

        {/* Mobile progress */}
        <div className="sm:hidden px-3 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-600 dark:text-gray-400">Прогресс</span>
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
              {solvedCount} / {totalWords}
            </span>
          </div>
          <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${totalWords > 0 ? (solvedCount / totalWords) * 100 : 0}%` }}
            />
          </div>
        </div>
      </header>

      {/* Completion banner */}
      {isCompleted && (
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white py-2 px-3 text-center shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5" />
            <span className="font-bold text-base">Поздравляем! Все слова разгаданы!</span>
            <Trophy className="w-5 h-5" />
          </div>
          <button
            onClick={generateNew}
            className="mt-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 mx-auto"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Новый сканворд
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-full mx-auto px-2 py-3 overflow-x-hidden">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Timer */}
          <div className="lg:w-16 shrink-0 flex lg:flex-col items-center justify-center gap-2">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-md p-2 flex flex-col items-center gap-1 transition-colors">
              <Timer className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-mono font-bold text-gray-800 dark:text-gray-100">
                {formatTime(elapsedSeconds)}
              </span>
              <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Время</span>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 flex justify-center min-w-0">
            <DraggableGrid>
              {crossword && <CrosswordGrid crossword={crossword} />}
            </DraggableGrid>
          </div>

          {/* Word list sidebar */}
          <aside className="lg:w-64 shrink-0">
            <WordList words={crossword?.words || []} />
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
