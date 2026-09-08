import { useEffect, useState } from 'react';
import { CrosswordData } from './types/crossword';
import { crosswordApi } from './services/crosswordApi';
import { useCrosswordStore } from './store/crosswordStore';
import CrosswordGrid from './components/CrosswordGrid';
import WordList from './components/WordList';
import { Shuffle, Trophy, Lightbulb } from 'lucide-react';

function App() {
  const [crossword, setCrossword] = useState<CrosswordData | null>(null);
  const [loading, setLoading] = useState(true);
  const solvedCount = useCrosswordStore((state) => state.getSolvedCount());
  const totalWords = useCrosswordStore((state) => state.words.length);
  const resetStore = useCrosswordStore((state) => state.reset);
  const hints = useCrosswordStore((state) => state.hints);
  const activeCellId = useCrosswordStore((state) => state.activeCellId);
  const useHint = useCrosswordStore((state) => state.useHint);

  useEffect(() => {
    loadCrossword();
  }, []);

  const loadCrossword = async () => {
    setLoading(true);
    const data = await crosswordApi.fetchCrossword('crossword-1');
    setCrossword(data);
    useCrosswordStore.getState().loadCrossword(data);
    setLoading(false);
  };

  const generateNew = async () => {
    setLoading(true);
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 text-lg">Генерируем сканворд...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">С</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Сканворд</h1>
              <p className="text-xs text-gray-500">Решай кроссворды онлайн</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Progress */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">
                  {isCompleted ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Trophy className="w-4 h-4" /> Все угадано!
                    </span>
                  ) : (
                    `Угадано: ${solvedCount} / ${totalWords}`
                  )}
                </p>
                <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${totalWords > 0 ? (solvedCount / totalWords) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Hint button */}
            <button
              onClick={handleUseHint}
              disabled={hints <= 0 || !activeCellId}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all shadow-md active:scale-95 ${
                hints > 0 && activeCellId
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white hover:from-yellow-500 hover:to-amber-600 hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              title={hints > 0 ? 'Показать букву на активной клетке' : 'Подсказки закончились'}
            >
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">{hints}</span>
            </button>

            {/* New crossword button */}
            <button
              onClick={generateNew}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-lg hover:from-amber-500 hover:to-orange-600 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">Новый</span>
            </button>
          </div>
        </div>

        {/* Mobile progress */}
        <div className="sm:hidden px-4 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Прогресс</span>
            <span className="text-xs font-medium text-gray-700">
              {solvedCount} / {totalWords}
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${totalWords > 0 ? (solvedCount / totalWords) * 100 : 0}%` }}
            />
          </div>
        </div>
      </header>

      {/* Completion banner */}
      {isCompleted && (
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white py-3 px-4 text-center shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6" />
            <span className="font-bold text-lg">Поздравляем! Все слова разгаданы!</span>
            <Trophy className="w-6 h-6" />
          </div>
          <button
            onClick={generateNew}
            className="mt-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 mx-auto"
          >
            <Shuffle className="w-4 h-4" />
            Новый сканворд
          </button>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Grid */}
          <div className="flex-1 flex justify-center">
            <div className="overflow-x-auto pb-4">
              {crossword && <CrosswordGrid crossword={crossword} />}
            </div>
          </div>

          {/* Word list sidebar */}
          <aside className="lg:w-72 shrink-0">
            <WordList words={crossword?.words || []} />
          </aside>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-white/60 rounded-xl p-4 text-sm text-gray-600">
          <h3 className="font-medium text-gray-800 mb-2">Как играть:</h3>
          <ul className="grid sm:grid-cols-2 gap-2">
            <li className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              Нажмите на клетку с вопросом — фокус перейдёт на первую букву
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              Вводите буквы — фокус автоматически перемещается
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              Backspace — удаляет букву или переходит назад
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              Tab — переключение между словами
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default App;
