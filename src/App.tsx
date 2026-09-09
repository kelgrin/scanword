import { useEffect, useState, useRef } from 'react';
import { CrosswordData } from './types/crossword';
import { crosswordApi } from './services/crosswordApi';
import { useCrosswordStore } from './store/crosswordStore';
import CrosswordGrid from './components/CrosswordGrid';
import WordList from './components/WordList';
import DraggableGrid from './components/DraggableGrid';
import MultiplayerPage from './components/MultiplayerPage';
import Chat from './components/Chat';
import {
  subscribeToGameState,
  subscribeToPlayers,
  subscribeToRoomCrossword,
  getRoomLetters,
  getRoomPlayers,
  saveLetter,
  deleteLetter,
  Player,
} from './services/multiplayerApi';
import { Shuffle, Trophy, Lightbulb, Timer, Sun, Moon, Users } from 'lucide-react';

function App() {
  const [crossword, setCrossword] = useState<CrosswordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  
  // Multiplayer state
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('playerName') || `Игрок${Math.floor(Math.random() * 1000)}`;
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [myColor, setMyColor] = useState<string>('#3B82F6');
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const solvedCount = useCrosswordStore((state) => state.getSolvedCount());
  const totalWords = useCrosswordStore((state) => state.words.length);
  const resetStore = useCrosswordStore((state) => state.reset);
  const hints = useCrosswordStore((state) => state.hints);
  const activeCellId = useCrosswordStore((state) => state.activeCellId);
  const useHint = useCrosswordStore((state) => state.useHint);
  const cells = useCrosswordStore((state) => state.cells);

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

  // Multiplayer subscriptions
  useEffect(() => {
    if (!isMultiplayer || !roomId || !playerId) return;

    // Загружаем начальное состояние
    getRoomLetters(roomId).then((letters) => {
      letters.forEach((letter) => {
        useCrosswordStore.getState().setInput(letter.cell_id, letter.letter, letter.player_color, letter.player_id);
      });
    });

    getRoomPlayers(roomId).then((playersList) => {
      setPlayers(playersList);
      const me = playersList.find((p) => p.player_id === playerId);
      if (me) setMyColor(me.color);
    });

    // Подписываемся на изменения состояния
    const gameStateSub = subscribeToGameState(roomId, (payload) => {
      if (payload.new.player_id === playerId) return; // Игнорируем свои изменения
      
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        useCrosswordStore.getState().setInput(
          payload.new.cell_id, 
          payload.new.letter,
          payload.new.player_color,
          payload.new.player_id
        );
      } else if (payload.eventType === 'DELETE') {
        useCrosswordStore.getState().clearInput(payload.old?.cell_id || '');
      }
    });

    // Подписываемся на изменения игроков
    const playersSub = subscribeToPlayers(roomId, () => {
      getRoomPlayers(roomId).then(setPlayers);
    });

    // Подписываемся на изменения кроссворда (когда создатель создаёт новый)
    const crosswordSub = subscribeToRoomCrossword(roomId, (newCrosswordData) => {
      // Проверяем, что это действительно новый кроссворд
      if (newCrosswordData.id !== crossword?.id) {
        setCrossword(newCrosswordData);
        useCrosswordStore.getState().loadCrossword(newCrosswordData);
        setElapsedSeconds(0);
      }
    });

    return () => {
      gameStateSub.unsubscribe();
      playersSub.unsubscribe();
      crosswordSub.unsubscribe();
    };
  }, [isMultiplayer, roomId, playerId, crossword?.id]);

  // Сохраняем имя игрока
  useEffect(() => {
    localStorage.setItem('playerName', playerName);
  }, [playerName]);

  // Сохраняем изменения в БД при мультиплеере
  useEffect(() => {
    if (!isMultiplayer || !roomId || !playerId) return;

    // Подписываемся на изменения в cells
    const unsubscribe = useCrosswordStore.subscribe((state, prevState) => {
      if (state.cells !== prevState.cells) {
        // Находим измененные клетки
        state.cells.forEach((cell, index) => {
          const prevCell = prevState.cells[index];
          if (cell.userInput !== prevCell.userInput) {
            // Клетка изменилась
            if (cell.userInput) {
              // Буква добавлена/изменена - сохраняем с playerId
              saveLetter(roomId, playerId, cell.id, cell.userInput, myColor);
            } else {
              // Буква удалена - только если она принадлежала текущему игроку
              if (prevCell.playerId === playerId) {
                deleteLetter(roomId, playerId, cell.id);
              }
            }
          }
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isMultiplayer, roomId, playerId, myColor]);

  // Автоматическая синхронизация каждые 1 секунду
  useEffect(() => {
    if (!isMultiplayer || !roomId) return;

    const syncInterval = setInterval(async () => {
      try {
        const { getRoomLetters, getRoomPlayers } = await import('./services/multiplayerApi');
        
        // Синхронизировать буквы
        const letters = await getRoomLetters(roomId);
        const dbCellIds = new Set(letters.map(l => l.cell_id));
        const currentCells = useCrosswordStore.getState().cells;
        
        // Добавляем/обновляем буквы из БД
        letters.forEach((letter) => {
          const currentCell = currentCells.find(c => c.id === letter.cell_id);
          
          // Обновляем только если:
          // 1. Локальной буквы нет, или
          // 2. Локальная буква от другого игрока, или
          // 3. Локальная буква от текущего игрока, но отличается от серверной (значит другой игрок её изменил)
          if (!currentCell || !currentCell.userInput) {
            // Клетка пуста локально - добавляем из БД
            useCrosswordStore.getState().setInput(letter.cell_id, letter.letter, letter.player_color, letter.player_id);
          } else if (currentCell.playerId !== playerId && currentCell.userInput !== letter.letter) {
            // Буква от другого игрока и отличается - обновляем
            useCrosswordStore.getState().setInput(letter.cell_id, letter.letter, letter.player_color, letter.player_id);
          }
          // Если буква от текущего игрока - не трогаем (избегаем лагов)
        });
        
        // Удаляем буквы, которых нет в БД (были удалены другим игроком)
        currentCells.forEach((cell) => {
          if (cell.userInput && !dbCellIds.has(cell.id)) {
            // Эта буква есть локально, но отсутствует в БД - значит её удалили
            // Удаляем только если буква от другого игрока
            if (cell.playerId !== playerId) {
              useCrosswordStore.getState().clearInput(cell.id);
            }
          }
        });
        
        // Синхронизировать игроков
        const playersList = await getRoomPlayers(roomId);
        setPlayers(playersList);
      } catch (error) {
        console.error('[AutoSync] Error:', error);
      }
    }, 1000); // Каждую секунду

    return () => {
      clearInterval(syncInterval);
    };
  }, [isMultiplayer, roomId, playerId]);

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
    // В мультиплеере только создатель может создавать новый кроссворд
    if (isMultiplayer && creatorId !== playerId) {
      alert('Только создатель комнаты может создавать новый кроссворд');
      return;
    }

    setLoading(true);
    setElapsedSeconds(0);
    resetStore();
    const data = await crosswordApi.generateNew();
    
    // В мультиплеере обновляем кроссворд в комнате
    if (isMultiplayer && roomId && playerId) {
      try {
        const { updateRoomCrossword } = await import('./services/multiplayerApi');
        await updateRoomCrossword(roomId, playerId, data);
      } catch (err) {
        console.error('Failed to update room crossword:', err);
        alert(err instanceof Error ? err.message : 'Ошибка обновления кроссворда');
        setLoading(false);
        return;
      }
    }
    
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

  // Multiplayer handlers
  const handleRoomCreated = (newRoomId: string, newPlayerId: string, code: string, crosswordData: CrosswordData) => {
    setRoomId(newRoomId);
    setPlayerId(newPlayerId);
    setCreatorId(newPlayerId); // Создатель - это текущий игрок
    setIsMultiplayer(true);
    setShowMultiplayer(false);
    setCrossword(crosswordData);
    setLoading(false);
  };

  const handleRoomJoined = (newRoomId: string, newPlayerId: string, crosswordData: CrosswordData, roomCreatorId: string) => {
    setRoomId(newRoomId);
    setPlayerId(newPlayerId);
    setCreatorId(roomCreatorId); // Получаем создателя из комнаты
    setIsMultiplayer(true);
    setShowMultiplayer(false);
    setCrossword(crosswordData);
    setLoading(false);
  };

  const handleLeaveMultiplayer = async () => {
    if (roomId && playerId) {
      const { leaveRoom } = await import('./services/multiplayerApi');
      await leaveRoom(roomId, playerId);
    }
    setIsMultiplayer(false);
    setRoomId(null);
    setPlayerId(null);
    setPlayers([]);
  };

  const handleManualSync = async () => {
    if (!roomId) return;
    
    // Синхронизировать буквы
    const { getRoomLetters } = await import('./services/multiplayerApi');
    const letters = await getRoomLetters(roomId);
    letters.forEach((letter) => {
      useCrosswordStore.getState().setInput(letter.cell_id, letter.letter, letter.player_color, letter.player_id);
    });
    
    // Синхронизировать игроков
    const { getRoomPlayers } = await import('./services/multiplayerApi');
    const playersList = await getRoomPlayers(roomId);
    setPlayers(playersList);
  };

  const isCompleted = totalWords > 0 && solvedCount === totalWords;

  // Show multiplayer page
  if (showMultiplayer) {
    return (
      <MultiplayerPage
        onBack={() => setShowMultiplayer(false)}
        onRoomCreated={handleRoomCreated}
        onRoomJoined={handleRoomJoined}
      />
    );
  }

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

            {/* Multiplayer button */}
            {!isMultiplayer && (
              <button
                onClick={() => setShowMultiplayer(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-sm">Мультиплеер</span>
              </button>
            )}

            {/* Leave multiplayer button */}
            {isMultiplayer && (
              <>
                <button
                  onClick={handleManualSync}
                  className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                  title="Синхронизировать"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  onClick={handleLeaveMultiplayer}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-lg hover:from-red-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  <span className="hidden sm:inline text-sm">Выйти</span>
                </button>
              </>
            )}

            {/* New crossword button */}
            <button
              onClick={generateNew}
              disabled={isMultiplayer && creatorId !== playerId}
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-lg hover:from-amber-500 hover:to-orange-600 transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title={isMultiplayer && creatorId !== playerId ? 'Только создатель комнаты может создавать новый кроссворд' : ''}
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
              {crossword && <CrosswordGrid crossword={crossword} playerColor={isMultiplayer ? myColor : undefined} playerId={isMultiplayer ? playerId || undefined : undefined} />}
            </DraggableGrid>
          </div>

          {/* Word list sidebar */}
          <aside className="lg:w-64 shrink-0">
            <WordList words={crossword?.words || []} />
          </aside>
        </div>

        {/* Multiplayer players indicator */}
        {isMultiplayer && players.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 dark:text-gray-400">Игроки:</span>
            {players.map((player) => (
              <div
                key={player.player_id}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: player.color }}
              >
                {player.player_name}
                {player.player_id === playerId && ' (вы)'}
              </div>
            ))}
            <div className="flex items-center gap-1 ml-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Синхронизация активна" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Online</span>
            </div>
          </div>
        )}
      </main>

      {/* Chat component for multiplayer */}
      {isMultiplayer && roomId && playerId && (
        <Chat roomId={roomId} playerId={playerId} playerName={playerName} />
      )}
    </div>
  );
}

export default App;
